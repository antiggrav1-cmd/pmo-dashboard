import React, { memo, useState, useMemo } from "react";
import {
  FolderKanban,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ChevronDown
} from "lucide-react";

export const Sidebar = memo(function Sidebar({
  portfolios = [],
  activePortfolioId = "",
  isAnderDashboardActive = false,
  onOpenAnderDashboard,
  onSelectPortfolio,
  onOpenCreatePortfolio,
  onOpenEditPortfolio,
  onOpenDeletePortfolio
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedAtcs, setCollapsedAtcs] = useState({});

  // Group portfolios by ATC Responsable
  const groupedByAtc = useMemo(() => {
    const groups = {};
    portfolios.forEach((p) => {
      const atcName = (p.atc && p.atc.trim()) ? p.atc.trim() : "Sin Asignar";
      if (!groups[atcName]) {
        groups[atcName] = [];
      }
      groups[atcName].push(p);
    });

    // Sort ATC groups alphabetically, keeping "Sin Asignar" at the end if desired
    return Object.keys(groups).sort((a, b) => {
      if (a === "Sin Asignar") return 1;
      if (b === "Sin Asignar") return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
  }, [portfolios]);

  const toggleAtcCollapse = (atcName) => {
    setCollapsedAtcs((prev) => ({
      ...prev,
      [atcName]: !prev[atcName]
    }));
  };

  return (
    <aside className={`glass-navy flex flex-col h-screen shrink-0 border-r border-navy-light/60 select-none shadow-xl transition-all duration-300 ease-in-out ${collapsed ? "w-14" : "w-64"}`}>
      {/* Brand Header */}
      <div className="p-3 border-b border-navy-light/60 flex items-center justify-between gap-2 min-h-[60px]">
        {collapsed ? (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-xl bg-lemony text-navy flex items-center justify-center font-black text-[10px] shadow-md">
              PMO
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-lemony text-navy flex items-center justify-center font-black text-xs tracking-wider shadow-md shrink-0">
                PMO
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-white text-sm leading-tight tracking-tight truncate">PMO Tracker</h1>
                <p className="text-[10px] font-bold text-lemony uppercase tracking-widest mt-0.5">Control Ejecutivo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="shrink-0 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Ocultar barra lateral"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dashboard General Master Button */}
      <div className={`border-b border-navy-light/40 ${collapsed ? "px-1.5 py-2" : "p-3"}`}>
        <button
          type="button"
          onClick={onOpenAnderDashboard}
          title={collapsed ? "Dashboard General — Salud de Portafolios" : undefined}
          className={`w-full flex items-center transition-all cursor-pointer shadow-md rounded-2xl ${
            collapsed ? "justify-center p-2" : "justify-between px-3.5 py-2.5"
          } text-xs font-bold ${
            isAnderDashboardActive
              ? "bg-gradient-to-r from-lemony to-lemony-light text-navy font-black shadow-lemony/20 ring-2 ring-lemony/50 scale-[1.02]"
              : "bg-navy-dark/90 hover:bg-navy-light/60 text-white border border-white/10 hover:border-lemony/40"
          }`}
        >
          <div className={`flex items-center gap-2.5 min-w-0`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isAnderDashboardActive ? "bg-navy text-lemony" : "bg-lemony/20 text-lemony"
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            {!collapsed && (
              <div className="text-left">
                <span className="block font-black tracking-tight text-[12px] leading-tight">Dashboard General</span>
                <span className={`block text-[10px] font-semibold ${isAnderDashboardActive ? "text-navy/80" : "text-nashville"}`}>
                  Salud de Portafolios
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${
              isAnderDashboardActive ? "bg-navy text-lemony" : "bg-lemony text-navy"
            }`}>
              {portfolios.length}
            </span>
          )}
        </button>
      </div>

      {/* Portfolios Section Grouped by ATC */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 overflow-x-hidden">
        {/* Expand button & Add Portfolio — only shown when collapsed, at top of list */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Mostrar barra lateral"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCreatePortfolio}
              className="p-1.5 rounded-lg text-lemony hover:bg-white/10 transition-colors cursor-pointer"
              title="Crear nuevo portafolio"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-nashville/80">
              Grupos por ATC ({Object.keys(groupedByAtc).length})
            </span>
            <button
              onClick={onOpenCreatePortfolio}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl text-navy bg-lemony hover:bg-lemony-light transition-all cursor-pointer shadow-xs card-hover"
              title="Crear nuevo portafolio"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>Nuevo</span>
            </button>
          </div>
        )}

        {/* Render ATC Groups */}
        {Object.entries(groupedByAtc).map(([atcName, atcPortfolios]) => {
          const isAtcCollapsed = Boolean(collapsedAtcs[atcName]);
          const _totalAtcProjects = atcPortfolios.reduce((acc, p) => acc + (p.projects || []).length, 0);

          return (
            <div key={atcName} className="space-y-1">
              {/* ATC Group Header */}
              {!collapsed && (
                <div
                  onClick={() => toggleAtcCollapse(atcName)}
                  className="flex items-center justify-between px-4 py-1 text-[11px] font-bold text-nashville/90 hover:text-white cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-lemony shrink-0" />
                    <span className="truncate font-black tracking-tight text-white/90">
                      {atcName === "Sin Asignar" ? "Sin ATC Asignado" : `ATC: ${atcName}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-nashville font-semibold">
                      {atcPortfolios.length} {atcPortfolios.length === 1 ? "port" : "ports"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-white/40 group-hover:text-white transition-transform ${
                        isAtcCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Portfolios list under this ATC */}
              {(!isAtcCollapsed || collapsed) && (
                <div className="space-y-1">
                  {atcPortfolios.map((portfolio) => {
                    const isActive = portfolio.id === activePortfolioId;
                    const delayedCount = (portfolio.projects || []).filter(
                      (p) => (p.status || "").toLowerCase().includes("atrasad") || (Number(p.gap) || 0) < -5
                    ).length;

                    return collapsed ? (
                      /* ── COLLAPSED: icon only ── */
                      <div key={portfolio.id} className="px-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectPortfolio(portfolio.id)}
                          title={`[ATC: ${portfolio.atc || "Sin Asignar"}] ${portfolio.name}${delayedCount > 0 ? ` • ${delayedCount} atrasados` : ""}`}
                          className={`w-full flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                            isActive
                              ? "bg-lemony text-navy shadow-md"
                              : "text-nashville hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className="relative">
                            <FolderKanban className="w-4 h-4" />
                            {delayedCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
                                {delayedCount > 9 ? "9+" : delayedCount}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    ) : (
                      /* ── EXPANDED: full row ── */
                      <div
                        key={portfolio.id}
                        className={`group relative flex items-center justify-between rounded-2xl mx-3 px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-lemony to-lemony-light text-navy font-black shadow-md scale-[1.02]"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                        onClick={() => onSelectPortfolio(portfolio.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FolderKanban
                            className={`w-4 h-4 shrink-0 ${isActive ? "text-navy" : "text-nashville"}`}
                          />
                          <div className="truncate">
                            <p className="truncate font-bold tracking-tight">{portfolio.name}</p>
                            <div className={`flex items-center gap-1.5 text-[10px] font-semibold mt-0.5 ${isActive ? "text-navy/80" : "text-nashville"}`}>
                              <span>{(portfolio.projects || []).length} proyectos</span>
                              {delayedCount > 0 && (
                                <span className={`${isActive ? "text-rose-700" : "text-rose-400"} font-black`}>
                                  • {delayedCount} atrasados
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons on Hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditPortfolio(portfolio);
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${isActive ? "text-navy hover:bg-navy/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
                            title="Editar portafolio y ATC"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          {portfolios.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDeletePortfolio(portfolio);
                              }}
                              className="p-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
                              title="Eliminar portafolio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
});
