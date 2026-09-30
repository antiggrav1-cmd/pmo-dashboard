import React, { memo, useMemo, useState } from "react";
import { CalendarClock, AlertTriangle, Zap, DollarSign } from "lucide-react";
import { 
  getPortfolioMetrics, 
  getPortfolioFinancials, 
  formatDate 
} from "../utils/calculations";
import { CountUpNumber } from "./CountUpNumber";
import { TargetProgressBar } from "./TargetProgressBar";

export const DashboardOverview = memo(function DashboardOverview({
  projects = [],
  portfolioTitle: _portfolioTitle = ""
}) {
  const [progressSort, setProgressSort] = useState("desc");
  const metrics = useMemo(() => getPortfolioMetrics(projects), [projects]);
  const financials = useMemo(() => getPortfolioFinancials(projects), [projects]);

  // Connection state counts (Montaje / Energizado / Entregado)
  const connectionStats = useMemo(() => {
    const montaje   = projects.filter((p) => (p.connectionState || "Montaje") === "Montaje").length;
    const energizado= projects.filter((p) => p.connectionState === "Energizado").length;
    const entregado = projects.filter((p) => p.connectionState === "Entregado").length;
    return { montaje, energizado, entregado };
  }, [projects]);

  // Upcoming milestones:
  // - Entregado: excluded
  // - Energizado: hide FPO, show badge Energizado, sort by COD
  // - Non-energizado: show FPO and COD, sort by FPO (fallback COD)
  const upcomingMilestones = useMemo(() => {
    return [...projects]
      .filter((p) => {
        const state = p.connectionState || "Ingeniería";
        if (state === "Entregado") return false;
        return state === "Energizado" ? Boolean(p.cod) : Boolean(p.fpo || p.cod);
      })
      .sort((a, b) => {
        const isEnergizadoA = a.connectionState === "Energizado";
        const isEnergizadoB = b.connectionState === "Energizado";
        const dateA = isEnergizadoA ? (a.cod || "9999-12-31") : (a.fpo || a.cod || "9999-12-31");
        const dateB = isEnergizadoB ? (b.cod || "9999-12-31") : (b.fpo || b.cod || "9999-12-31");
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        return (isNaN(timeA) ? 9999999999999 : timeA) - (isNaN(timeB) ? 9999999999999 : timeB);
      });
  }, [projects]);

  const sortedProgressProjects = useMemo(() => [...projects].sort((a, b) => {
    const difference = (Number(a.realProgress) || 0) - (Number(b.realProgress) || 0);
    return progressSort === "asc" ? difference : -difference;
  }), [projects, progressSort]);

  return (
    <div className="space-y-5 mb-6">
      {/* 4 Executive KPI Cards: Avance -> Facturación COP -> Facturación USD -> Salud Operativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: Avance General & GAP */}
        <div className="glass-card glass-glow card-hover min-w-0 min-h-[196px] p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-navy animate-pulse"></div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Avance &amp; Desviación
              </span>
            </div>
            <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black shadow-2xs ${
              metrics.avgGap < -5 
                ? "bg-rose-100 text-rose-700 border border-rose-200" 
                : metrics.avgGap < 0 
                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}>
              <CountUpNumber 
                value={metrics.avgGap} 
                prefix={metrics.avgGap > 0 ? "GAP +" : "GAP "} 
                suffix="%" 
                decimals={1} 
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Real vs Scheduled comparison */}
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Avance Real
                </span>
                <span className="text-3xl font-black text-navy leading-none">
                  <CountUpNumber value={metrics.avgReal} suffix="%" decimals={1} />
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Meta Prog.
                </span>
                <span className="text-xl font-black text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-xl border border-slate-200 inline-block leading-normal">
                  <CountUpNumber value={metrics.avgScheduled} suffix="%" decimals={1} />
                </span>
              </div>
            </div>

            {/* Target Pin Progress Bar */}
            <div className="space-y-1 pt-1">
              <TargetProgressBar
                real={metrics.avgReal}
                scheduled={metrics.avgScheduled}
                height="h-3"
                showPin={true}
                showLabels={false}
              />
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-0.5 pt-0.5">
                <span className="flex items-center gap-1 text-navy font-bold">
                  <span className="w-2 h-2 rounded-xs bg-navy inline-block"></span> Real: {metrics.avgReal}%
                </span>
                <span className="flex items-center gap-1 text-slate-500 font-bold">
                  <span className="w-2 h-2 rounded-xs bg-slate-400 inline-block"></span> Meta: {metrics.avgScheduled}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Facturación & Recaudo Consolidado (COP + USD unificados) */}
        <div className="glass-card glass-glow card-hover min-w-0 min-h-[196px] p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Facturación &amp; Recaudo
              </span>
            </div>
            <span className="shrink-0 text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              <CountUpNumber 
                value={financials.effectiveness} 
                suffix="% Cobrado" 
              />
            </span>
          </div>

          <div className="mt-2.5 space-y-2 min-w-0">
            {/* COP section */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Portafolio COP</span>
                <span className="text-base font-black text-navy leading-tight">
                  <CountUpNumber value={financials.totalCop} format="cop" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <div className="bg-emerald-50/70 rounded-lg p-1 text-center border border-emerald-100">
                  <span className="text-emerald-700 font-bold block text-[9px]">Recaudado</span>
                  <span className="font-black text-emerald-800 block truncate text-[10px]">
                    <CountUpNumber value={financials.cobradoCop} format="cop" />
                  </span>
                </div>
                <div className="bg-cyan-50/70 rounded-lg p-1 text-center border border-cyan-100">
                  <span className="text-cyan-700 font-bold block text-[9px]">En trámite</span>
                  <span className="font-black text-cyan-800 block truncate text-[10px]">
                    <CountUpNumber value={financials.enTramiteCop} format="cop" />
                  </span>
                </div>
                <div className="bg-amber-50/70 rounded-lg p-1 text-center border border-amber-100">
                  <span className="text-amber-700 font-bold block text-[9px]">Por cobrar</span>
                  <span className="font-black text-amber-800 block truncate text-[10px]">
                    <CountUpNumber value={financials.porCobrarCop} format="cop" />
                  </span>
                </div>
              </div>
            </div>

            {/* USD section (if exists) */}
            {financials.totalUsd > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Portafolio USD</span>
                  <span className="text-sm font-black text-blue-900 leading-tight">
                    <CountUpNumber value={financials.totalUsd} format="usd" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="bg-emerald-50/70 rounded-lg p-1 text-center border border-emerald-100">
                    <span className="text-emerald-700 font-bold block text-[9px]">Recaudado</span>
                    <span className="font-black text-emerald-800 block truncate text-[10px]">
                      <CountUpNumber value={financials.cobradoUsd} format="usd" />
                    </span>
                  </div>
                  <div className="bg-cyan-50/70 rounded-lg p-1 text-center border border-cyan-100">
                    <span className="text-cyan-700 font-bold block text-[9px]">En trámite</span>
                    <span className="font-black text-cyan-800 block truncate text-[10px]">
                      <CountUpNumber value={financials.enTramiteUsd} format="usd" />
                    </span>
                  </div>
                  <div className="bg-amber-50/70 rounded-lg p-1 text-center border border-amber-100">
                    <span className="text-amber-700 font-bold block text-[9px]">Por cobrar</span>
                    <span className="font-black text-amber-800 block truncate text-[10px]">
                      <CountUpNumber value={financials.porCobrarUsd} format="usd" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Estado del Cronograma & Alertas */}
        <div className={`glass-card glass-glow card-hover min-w-0 min-h-[196px] p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between border ${
          (metrics.cregCriticalCount > 0 || metrics.criticalCount > 0) ? "border-rose-200 bg-rose-50/15" : ""
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${(metrics.cregCriticalCount > 0 || metrics.criticalCount > 0) ? "text-rose-600" : "text-emerald-600"}`} />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Cronograma &amp; Alertas
              </span>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black shadow-2xs ${
              (metrics.cregCriticalCount > 0 || metrics.criticalCount > 0) ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}>
              {metrics.delayedCount > 0 ? `${metrics.delayedCount} atrasados` : "Al día"}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black leading-none ${(metrics.cregCriticalCount > 0 || metrics.criticalCount > 0) ? "text-rose-600" : "text-emerald-700"}`}>
                  <CountUpNumber value={metrics.delayedCount} />
                </span>
                <span className="text-xs text-slate-500 font-bold">de {projects.length} proyectos con atraso</span>
              </div>
              <span className="text-xs text-slate-600 block mt-1.5 font-medium leading-tight">
                {metrics.delayedCount > 0 ? "Requiere plan de recuperación" : "✅ Todos los proyectos en tiempo"}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span className="text-emerald-700 font-black">🟢 {metrics.onTimeCount} en tiempo</span>
            {metrics.cregCriticalCount > 0 && <span className="text-rose-700 font-black">⚠️ {metrics.cregCriticalCount} CREG crítico</span>}
            {metrics.aheadCount > 0 && <span className="text-blue-700 font-black">🔵 {metrics.aheadCount} adelantados</span>}
          </div>
        </div>

        {/* Card 4: Conexión a la Red & Energización */}
        <div className="glass-card glass-glow card-hover min-w-0 min-h-[196px] p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Zap className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Conexión a Red
              </span>
            </div>
            <span className="shrink-0 text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              <CountUpNumber 
                value={projects.length > 0 ? Math.round(((connectionStats.energizado + connectionStats.entregado) / projects.length) * 100) : 0} 
                suffix="%" 
              />
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  <CountUpNumber value={connectionStats.energizado + connectionStats.entregado} />
                  <span className="text-base text-slate-400 font-bold"> / {projects.length}</span>
                </span>
                <span className="text-xs text-slate-400 font-semibold">proyectos listos</span>
              </div>
              <span className="text-xs text-slate-600 block mt-1.5 font-medium leading-tight">
                {connectionStats.entregado > 0 ? `${connectionStats.entregado} entregados comercialmente` : "En proceso de energización y pruebas"}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span className="text-amber-700 font-bold">⚡ {connectionStats.energizado} Energ.</span>
            <span className="text-slate-600 font-bold">🏗️ {connectionStats.montaje} Montaje</span>
            <span className="text-emerald-700 font-bold">✅ {connectionStats.entregado} Entreg.</span>
          </div>
        </div>
      </div>

      {/* Progress Bars & Critical Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Project Progress Overview Bars */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Comparativa de Avance: Real vs Programado
              </h3>
              <p className="text-xs text-slate-500">Visualización de avance con marcador de meta programada</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-navy">
                <span className="w-3 h-3 rounded-xs bg-navy inline-block"></span>
                <span>Real</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-[3px] h-3 bg-slate-900 rounded-full ring-1 ring-slate-300 inline-block"></span>
                <span>Meta Prog.</span>
              </div>
              <button type="button" onClick={() => setProgressSort((current) => current === "asc" ? "desc" : "asc")} className="text-[10px] px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-navy font-bold">
                {progressSort === "asc" ? "Menor → Mayor" : "Mayor → Menor"}
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {sortedProgressProjects.map((proj) => {
              const real = Number(proj.realProgress) || 0;
              const scheduled = Number(proj.scheduledProgress) || 0;
              const gap = Number(proj.gap) || 0;

              return (
                <div key={proj.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-800 font-semibold truncate max-w-[240px]">
                      {proj.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{real}% / {scheduled}%</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] border ${
                          gap < -15
                            ? "text-rose-700 bg-rose-50/90 border-rose-200/60"
                            : gap < 0
                            ? "text-amber-800 bg-amber-50/90 border-amber-200/60"
                            : "text-emerald-800 bg-emerald-50/90 border-emerald-200/60"
                        }`}
                      >
                        {gap > 0 ? `+${gap}%` : `${gap}%`}
                      </span>
                    </div>
                  </div>

                  {/* Target Pin Progress Bar */}
                  <TargetProgressBar
                    real={real}
                    scheduled={scheduled}
                    height="h-2.5"
                    showPin={true}
                    showLabels={false}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Key Milestones & Dates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-navy" />
                <span>Próximas Fechas Críticas</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {upcomingMilestones.length} activos
              </span>
            </div>

            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {upcomingMilestones.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay fechas críticas pendientes</p>
              ) : (
                upcomingMilestones.map((p) => {
                  const isEnergizado = p.connectionState === "Energizado";

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 truncate">{p.name}</p>
                          {isEnergizado && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                              ⚡ Energizado
                            </span>
                          )}
                        </div>
                        {!isEnergizado && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            FPO: <span className="font-semibold text-navy">{formatDate(p.fpo)}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">COD</span>
                        <span className="font-bold text-blue-700">{formatDate(p.cod)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>FPO: Puesta en Operación</span>
            <span>COD: Operación Comercial</span>
          </div>
        </div>
      </div>
    </div>
  );
});
