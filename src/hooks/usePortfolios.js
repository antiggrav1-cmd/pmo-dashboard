import { useState, useEffect, useCallback, useRef } from "react";
import { portfolioRepository } from "../services/portfolioRepository";
import { createProject, normalizePortfolio } from "../models/projectModel";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState(() => portfolioRepository.getAll());
  const [activePortfolioId, setActivePortfolioId] = useState(() => {
    const initial = portfolioRepository.getAll();
    return initial[0]?.id || "";
  });
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "connecting" : "local");
  const isBroadcastingRef = useRef(false);
  const hasLoadedFromCloudRef = useRef(!isSupabaseConfigured);

  // 1. Initial Cloud Sync on Mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // syncStatus already initialized to "local" in useState — just set the ref
      hasLoadedFromCloudRef.current = true;
      return;
    }

    let isMounted = true;

    async function loadCloudData() {
      try {
        setSyncStatus("connecting");
        const cloudData = await portfolioRepository.fetchAllFromCloud();
        if (isMounted) {
          hasLoadedFromCloudRef.current = true;
          if (cloudData && cloudData.length > 0) {
            setPortfolios(cloudData);
            setActivePortfolioId((prevId) => {
              if (!prevId || !cloudData.some((p) => p.id === prevId)) {
                return cloudData[0]?.id || "";
              }
              return prevId;
            });
          }
          setSyncStatus("connected");
        }
      } catch (err) {
        console.error("Error loading Supabase cloud data:", err);
        if (isMounted) {
          hasLoadedFromCloudRef.current = true;
          setSyncStatus("error");
        }
      }
    }

    loadCloudData();

    // 2. Setup Realtime Channel Subscription for Multi-user Collaboration
    const channel = supabase
      .channel("realtime:pmo_portfolios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pmo_portfolios"
        },
        (payload) => {
          // If the event was caused by this local client's save, we don't need to re-render
          if (isBroadcastingRef.current) return;

          console.log("Realtime event received from another analyst:", payload.eventType);

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const updatedItem = normalizePortfolio({
              id: payload.new.id,
              name: payload.new.name,
              code: payload.new.code,
              atc: payload.new.atc || payload.new.atcResponsible || "Sin Asignar",
              description: payload.new.description,
              projects: payload.new.projects || []
            });

            setPortfolios((prev) => {
              const exists = prev.some((p) => p.id === updatedItem.id);
              if (exists) {
                return prev.map((p) => (p.id === updatedItem.id ? updatedItem : p));
              }
              return [...prev, updatedItem];
            });
          } else if (payload.eventType === "DELETE") {
            setPortfolios((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setSyncStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setSyncStatus("offline");
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Auto-persist changes to local storage & Cloud (only after initial cloud fetch completes)
  useEffect(() => {
    if (!hasLoadedFromCloudRef.current) {
      return;
    }

    isBroadcastingRef.current = true;
    portfolioRepository.saveAll(portfolios).finally(() => {
      setTimeout(() => {
        isBroadcastingRef.current = false;
      }, 500);
    });
  }, [portfolios]);

  // Current active portfolio entity (always guaranteed safe fallback)
  const currentPortfolio = portfolios.find((p) => p.id === activePortfolioId) || portfolios[0] || {
    id: "default",
    name: "Mi Portafolio",
    code: "PORT-01",
    atc: "Sin Asignar",
    description: "",
    projects: []
  };

  // Switch active portfolio
  const selectPortfolio = useCallback((id) => {
    setActivePortfolioId(id);
  }, []);

  // Update a single project by ID inside active portfolio or global context
  const updateProject = useCallback((updatedProject) => {
    setPortfolios((prev) =>
      prev.map((port) => {
        const hasProject = (port.projects || []).some(
          (p) => p.id === updatedProject.id || p.id === updatedProject.sourceProjectId || `${port.id}::${p.id}` === updatedProject.id
        );
        if (!hasProject && port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: (port.projects || []).map((p) => {
            if (p.id === updatedProject.id || p.id === updatedProject.sourceProjectId || `${port.id}::${p.id}` === updatedProject.id) {
              const { sourceProjectId: _sid, portfolioName: _pname, ...cleanProject } = updatedProject;
              return { ...cleanProject, id: p.id };
            }
            return p;
          })
        };
      })
    );
  }, [currentPortfolio.id]);

  // Add a new empty project to active portfolio
  const addProject = useCallback((customData = {}) => {
    const count = (currentPortfolio.projects || []).length + 1;
    const newProj = createProject({
      name: `Nuevo Proyecto ${count}`,
      ...customData
    });

    setPortfolios((prev) =>
      prev.map((port) => {
        if (port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: [...(port.projects || []), newProj]
        };
      })
    );
    return newProj;
  }, [currentPortfolio.id, currentPortfolio.projects]);

  // Delete a project from active portfolio
  const deleteProject = useCallback((projectId) => {
    setPortfolios((prev) =>
      prev.map((port) => {
        if (port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: port.projects.filter((p) => p.id !== projectId)
        };
      })
    );
  }, [currentPortfolio.id]);

  // Create or update a portfolio
  const savePortfolio = useCallback((portfolioData) => {
    const normalized = normalizePortfolio(portfolioData);
    setPortfolios((prev) => {
      const exists = prev.some((p) => p.id === normalized.id);
      if (exists) {
        return prev.map((p) => (p.id === normalized.id ? { ...p, ...normalized } : p));
      } else {
        return [...prev, normalized];
      }
    });
    setActivePortfolioId(normalized.id);
    if (isSupabaseConfigured) {
      portfolioRepository.saveSinglePortfolio(normalized);
    }
  }, []);

  // Delete a portfolio permanently
  const deletePortfolio = useCallback((portfolioId) => {
    setPortfolios((prev) => {
      const remaining = prev.filter((p) => p.id !== portfolioId);
      if (activePortfolioId === portfolioId && remaining.length > 0) {
        setActivePortfolioId(remaining[0].id);
      }
      return remaining;
    });
    if (isSupabaseConfigured) {
      portfolioRepository.deleteFromCloud(portfolioId);
    }
  }, [activePortfolioId]);

  // Import projects to current portfolio
  const importToCurrentPortfolio = useCallback((newProjects = []) => {
    const normalizedNewProjects = newProjects.map(createProject);
    setPortfolios((prev) =>
      prev.map((port) => {
        if (port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: [...port.projects, ...normalizedNewProjects]
        };
      })
    );
  }, [currentPortfolio.id]);

  // Import new portfolios list
  const importNewPortfolios = useCallback((newPortfoliosList = []) => {
    const normalized = newPortfoliosList.map(normalizePortfolio);
    setPortfolios((prev) => [...prev, ...normalized]);
    if (normalized.length > 0) {
      setActivePortfolioId(normalized[0].id);
    }
  }, []);

  // Reset to initial sample data
  const resetData = useCallback(async () => {
    const reset = portfolioRepository.reset();
    setPortfolios(reset);
    setActivePortfolioId(reset[0]?.id || "");
  }, []);

  return {
    portfolios,
    currentPortfolio,
    activePortfolioId,
    syncStatus,
    isCloudActive: isSupabaseConfigured,
    selectPortfolio,
    updateProject,
    addProject,
    deleteProject,
    savePortfolio,
    deletePortfolio,
    importToCurrentPortfolio,
    importNewPortfolios,
    resetData
  };
}
