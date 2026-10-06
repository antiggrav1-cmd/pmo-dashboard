import { useState, useEffect, useCallback, useRef } from "react";
import { portfolioRepository } from "../services/portfolioRepository";
import { createProject, normalizePortfolio } from "../models/projectModel";
import { savePortfolios } from "../utils/storage";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState(() => portfolioRepository.getAll());
  const [activePortfolioId, setActivePortfolioId] = useState(() => {
    const initial = portfolioRepository.getAll();
    return initial[0]?.id || "";
  });
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "connecting" : "local");

  const hasLoadedFromCloudRef = useRef(!isSupabaseConfigured);
  const portfoliosRef = useRef(portfolios);
  portfoliosRef.current = portfolios;

  // Track timestamps of local edits per portfolio to prevent Realtime echo overwrites
  const lastLocalEditTimestamps = useRef({});
  // Track dirty portfolio IDs that need to be synced to Supabase Cloud
  const dirtyPortfolioIds = useRef(new Set());
  // Debounce timer for cloud persistence
  const cloudSyncTimerRef = useRef(null);

  // Debounced cloud synchronization function
  const scheduleCloudSync = useCallback(() => {
    if (!isSupabaseConfigured || !supabase) return;

    if (cloudSyncTimerRef.current) {
      clearTimeout(cloudSyncTimerRef.current);
    }

    cloudSyncTimerRef.current = setTimeout(async () => {
      if (!hasLoadedFromCloudRef.current) return;

      const dirtyIds = Array.from(dirtyPortfolioIds.current);
      dirtyPortfolioIds.current.clear();

      if (dirtyIds.length === 0) return;

      const currentList = portfoliosRef.current;
      const toSync = currentList.filter((p) => dirtyIds.includes(p.id));

      for (const port of toSync) {
        try {
          await portfolioRepository.saveSinglePortfolio(port);
        } catch (err) {
          console.error(`Error syncing portfolio ${port.name} (${port.id}) to cloud:`, err);
        }
      }
    }, 700);
  }, []);

  // Helper to commit state locally with 0ms latency and schedule cloud push
  const commitPortfolioChange = useCallback((updatedPortfolios, affectedPortfolioId) => {
    if (affectedPortfolioId) {
      lastLocalEditTimestamps.current[affectedPortfolioId] = Date.now();
      dirtyPortfolioIds.current.add(affectedPortfolioId);
    }
    // 1. Instant synchronous local storage persistence
    savePortfolios(updatedPortfolios);
    // 2. Schedule debounced cloud save
    scheduleCloudSync();
  }, [scheduleCloudSync]);

  // 1. Initial Cloud Sync on Mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
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
          } else {
            // Supabase table is empty. Seed from local data if available
            const localData = portfolioRepository.getAllLocal();
            if (localData && localData.length > 0) {
              setPortfolios(localData);
              setActivePortfolioId((prevId) => {
                if (!prevId || !localData.some((p) => p.id === prevId)) {
                  return localData[0]?.id || "";
                }
                return prevId;
              });
              portfolioRepository.saveAll(localData).catch((err) => {
                console.error("Error auto-seeding local data to Supabase:", err);
              });
            }
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
          const targetId = payload.new?.id || payload.old?.id;
          if (!targetId) return;

          // PROTECT LOCAL EDITS: If this portfolio was edited locally in the last 4 seconds or has pending sync, IGNORE the incoming echo!
          const lastEdit = lastLocalEditTimestamps.current[targetId] || 0;
          const isRecentLocalEdit = Date.now() - lastEdit < 4000;
          const hasPendingLocalSync = dirtyPortfolioIds.current.has(targetId);

          if (isRecentLocalEdit || hasPendingLocalSync) {
            return;
          }

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
              const next = exists
                ? prev.map((p) => (p.id === updatedItem.id ? updatedItem : p))
                : [...prev, updatedItem];
              savePortfolios(next);
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            setPortfolios((prev) => {
              const next = prev.filter((p) => p.id !== payload.old.id);
              savePortfolios(next);
              return next;
            });
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
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

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
    if (!updatedProject) return;

    setPortfolios((prev) => {
      let targetPortId = currentPortfolio.id;
      const next = prev.map((port) => {
        const hasProject = (port.projects || []).some(
          (p) => p.id === updatedProject.id || p.id === updatedProject.sourceProjectId || `${port.id}::${p.id}` === updatedProject.id
        );
        if (!hasProject && port.id !== currentPortfolio.id) return port;
        targetPortId = port.id;
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
      });

      commitPortfolioChange(next, targetPortId);
      return next;
    });
  }, [currentPortfolio.id, commitPortfolioChange]);

  // Add a new empty project to active portfolio
  const addProject = useCallback((customData = {}) => {
    const count = (currentPortfolio.projects || []).length + 1;
    const newProj = createProject({
      name: `Nuevo Proyecto ${count}`,
      ...customData
    });

    setPortfolios((prev) => {
      const next = prev.map((port) => {
        if (port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: [...(port.projects || []), newProj]
        };
      });
      commitPortfolioChange(next, currentPortfolio.id);
      return next;
    });
    return newProj;
  }, [currentPortfolio.id, currentPortfolio.projects, commitPortfolioChange]);

  // Delete a project from active portfolio
  const deleteProject = useCallback((projectId) => {
    setPortfolios((prev) => {
      const next = prev.map((port) => {
        if (port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: (port.projects || []).filter((p) => p.id !== projectId)
        };
      });
      commitPortfolioChange(next, currentPortfolio.id);
      return next;
    });
  }, [currentPortfolio.id, commitPortfolioChange]);

  // Create or update a portfolio
  const savePortfolio = useCallback((portfolioData) => {
    const normalized = normalizePortfolio(portfolioData);
    setPortfolios((prev) => {
      const exists = prev.some((p) => p.id === normalized.id);
      const next = exists
        ? prev.map((p) => (p.id === normalized.id ? { ...p, ...normalized } : p))
        : [...prev, normalized];
      commitPortfolioChange(next, normalized.id);
      return next;
    });
    setActivePortfolioId(normalized.id);
  }, [commitPortfolioChange]);

  // Delete a portfolio permanently
  const deletePortfolio = useCallback((portfolioId) => {
    setPortfolios((prev) => {
      const next = prev.filter((p) => p.id !== portfolioId);
      if (activePortfolioId === portfolioId && next.length > 0) {
        setActivePortfolioId(next[0].id);
      }
      savePortfolios(next);
      return next;
    });
    if (isSupabaseConfigured) {
      portfolioRepository.deleteFromCloud(portfolioId);
    }
  }, [activePortfolioId]);

  // Import projects to current portfolio
  const importToCurrentPortfolio = useCallback((newProjects = []) => {
    const normalizedNewProjects = newProjects.map(createProject);
    setPortfolios((prev) => {
      const next = prev.map((port) => {
        if (port.id !== currentPortfolio.id) return port;
        return {
          ...port,
          projects: [...(port.projects || []), ...normalizedNewProjects]
        };
      });
      commitPortfolioChange(next, currentPortfolio.id);
      return next;
    });
  }, [currentPortfolio.id, commitPortfolioChange]);

  // Import new portfolios list
  const importNewPortfolios = useCallback((newPortfoliosList = []) => {
    const normalized = newPortfoliosList.map(normalizePortfolio);
    setPortfolios((prev) => {
      const next = [...prev, ...normalized];
      normalized.forEach((p) => dirtyPortfolioIds.current.add(p.id));
      savePortfolios(next);
      scheduleCloudSync();
      return next;
    });
    if (normalized.length > 0) {
      setActivePortfolioId(normalized[0].id);
    }
  }, [scheduleCloudSync]);

  // Reset to initial sample data
  const resetData = useCallback(async () => {
    const reset = portfolioRepository.reset();
    setPortfolios(reset);
    setActivePortfolioId(reset[0]?.id || "");
    if (isSupabaseConfigured) {
      portfolioRepository.saveAll(reset);
    }
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
