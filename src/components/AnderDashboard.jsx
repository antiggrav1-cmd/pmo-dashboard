import React, { memo, useMemo, useState } from "react";
import { 
  Activity, 
  FolderKanban, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Search, 
  FileText, 
  Download 
} from "lucide-react";
import { 
  getPortfolioMetrics, 
  getPortfolioFinancials 
} from "../utils/calculations";
import { getPortfolioPerformanceIndices } from "../utils/budgetCalculations";
import { CountUpNumber } from "./CountUpNumber";
import { TargetProgressBar } from "./TargetProgressBar";

function PerformanceChip({ label, value }) {
  const state = value === null || value === undefined ? "bg-slate-100 text-slate-500 border-slate-200" : value >= 1 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : value >= .95 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200";
  return <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${state}`}>{label} {value === null || value === undefined ? "—" : value.toFixed(2)}</span>;
}

export const AnderDashboard = memo(function AnderDashboard({
  portfolios = [],
  onSelectPortfolio,
  onOpenCreatePortfolio,
  onOpenExecutiveReport,
  onExportExcel
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState("ALL");

  // Calculate detailed health summary for every portfolio
  const portfolioHealthList = useMemo(() => {
    return portfolios.map((portfolio) => {
      const projects = portfolio.projects || [];
      const metrics = getPortfolioMetrics(projects);
      const financials = getPortfolioFinancials(projects);
      const performance = getPortfolioPerformanceIndices(projects);

      const energizado = projects.filter((p) => p.connectionState === "Energizado").length;
      const entregado = projects.filter((p) => p.connectionState === "Entregado").length;
      const connectedCount = energizado + entregado;

      // Determine Health Level
      let healthStatus = "HEALTHY"; // HEALTHY | WARNING | CRITICAL
      let healthLabel = "Saludable";
      let healthBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";

      const delayedRatio = projects.length ? metrics.delayedCount / projects.length : 0;
      const criticalRatio = projects.length ? metrics.criticalCount / projects.length : 0;
      if (metrics.cregCriticalCount > 0 || metrics.avgGap < -25 || criticalRatio >= 0.6) {
        healthStatus = "CRITICAL";
        healthLabel = "Atención Urgente";
        healthBadge = "bg-rose-100 text-rose-700 border-rose-200";
      } else if (metrics.cregWarningCount > 0 || metrics.avgGap < -8 || delayedRatio >= 0.4) {
        healthStatus = "WARNING";
        healthLabel = "En Seguimiento";
        healthBadge = "bg-amber-100 text-amber-800 border-amber-200";
      }

      return {
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description,
        projectsCount: projects.length,
        metrics,
        financials,
        spi: performance.spi,
        cpi: performance.cpi,
        connectedCount,
        energizado,
        entregado,
        healthStatus,
        healthLabel,
        healthBadge,
        projects
      };
    });
  }, [portfolios]);

  // Global Consolidated Metrics across all portfolios
  const globalSummary = useMemo(() => {
    let totalProjects = 0;
    let totalConnected = 0;
    let totalCregCritical = 0;
    let totalCriticalDelays = 0;
    let totalCop = 0;
    let totalUsd = 0;
    let cobradoCop = 0;
    let cobradoUsd = 0;

    portfolioHealthList.forEach((p) => {
      const count = p.projectsCount;
      totalProjects += count;
      totalConnected += p.connectedCount;
      totalCregCritical += p.metrics.cregCriticalCount;
      totalCriticalDelays += p.metrics.criticalCount;
      totalCop += p.financials.totalCop;
      totalUsd += p.financials.totalUsd;
      cobradoCop += p.financials.cobradoCop;
      cobradoUsd += p.financials.cobradoUsd;
    });

    const globalMetrics = getPortfolioMetrics(portfolioHealthList.flatMap((portfolio) => portfolio.projects));
    const globalReal = globalMetrics.avgReal;
    const globalSched = globalMetrics.avgScheduled;
    const globalGap = globalMetrics.avgGap;
    const totalEquiv = totalCop + totalUsd * 4000;
    const cobradoEquiv = cobradoCop + cobradoUsd * 4000;
    const globalEffectiveness = totalEquiv > 0 ? Math.round((cobradoEquiv / totalEquiv) * 100) : 100;

    const healthyCount = portfolioHealthList.filter((p) => p.healthStatus === "HEALTHY").length;
    const warningCount = portfolioHealthList.filter((p) => p.healthStatus === "WARNING").length;
    const criticalCount = portfolioHealthList.filter((p) => p.healthStatus === "CRITICAL").length;

    return {
      totalPortfolios: portfolios.length,
      totalProjects,
      globalReal,
      globalSched,
      globalGap,
      totalConnected,
      totalCregCritical,
      totalCriticalDelays,
      totalCop,
      totalUsd,
      cobradoCop,
      cobradoUsd,
      globalEffectiveness,
      healthyCount,
      warningCount,
      criticalCount
    };
  }, [portfolioHealthList, portfolios]);

  // Filtered portfolios by search and health
  const filteredPortfolios = useMemo(() => {
    return portfolioHealthList.filter((p) => {
      const matchSearch = !searchTerm.trim() || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchHealth = healthFilter === "ALL" || p.healthStatus === healthFilter;
      return matchSearch && matchHealth;
    });
  }, [portfolioHealthList, searchTerm, healthFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner: Dashboard General */}
      <div className="glass-navy p-6 rounded-3xl text-white relative overflow-hidden shadow-xl border border-navy-light/60">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-lemony/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-lemony text-navy flex items-center justify-center font-black shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                  Dashboard General
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-lemony text-navy font-black tracking-wider uppercase">
                    Salud Global
                  </span>
                </h1>
                <p className="text-xs text-nashville font-medium">
                  Centro de Control Ejecutivo — Diagnóstico Consolidado de todos los Portafolios
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-navy-dark/70 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs">
              <span className="text-white/60">Semáforo Global:</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                🟢 {globalSummary.healthyCount}
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                🟡 {globalSummary.warningCount}
              </span>
              <span className="flex items-center gap-1 font-bold text-rose-400">
                🔴 {globalSummary.criticalCount}
              </span>
            </div>

            {/* Download Actions */}
            <div className="flex items-center gap-2">
              {onOpenExecutiveReport && (
                <button
                  type="button"
                  onClick={onOpenExecutiveReport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-navy bg-lemony hover:bg-lemony-light shadow-md transition-all cursor-pointer"
                  title="Informe Ejecutivo consolidado del Dashboard General"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Informe Global</span>
                </button>
              )}
              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 shadow-md transition-all cursor-pointer"
                  title="Exportar todos los portafolios a Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Global</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Filter & Search Bar for Portfolios */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">Filtrar por Salud:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setHealthFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                healthFilter === "ALL" ? "bg-navy text-white shadow-2xs" : "text-slate-600 hover:text-navy"
              }`}
            >
              Todos ({portfolioHealthList.length})
            </button>
            <button
              onClick={() => setHealthFilter("HEALTHY")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                healthFilter === "HEALTHY" ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              🟢 Saludables ({globalSummary.healthyCount})
            </button>
            <button
              onClick={() => setHealthFilter("WARNING")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                healthFilter === "WARNING" ? "bg-amber-500 text-slate-950 font-black shadow-2xs" : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              🟡 En Riesgo ({globalSummary.warningCount})
            </button>
            <button
              onClick={() => setHealthFilter("CRITICAL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                healthFilter === "CRITICAL" ? "bg-rose-600 text-white shadow-2xs" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              🔴 Críticos ({globalSummary.criticalCount})
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar portafolio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs text-slate-800 focus:outline-none transition-all w-60"
          />
        </div>
      </div>

      {/* Grid of Portfolio Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPortfolios.map((port) => {
          return (
            <div
              key={port.id}
              className="glass-card glass-glow card-hover rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all"
            >
              <div>
                {/* Header: Title & Health Badge */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-navy shrink-0" />
                      <h3 className="font-extrabold text-slate-900 text-sm truncate" title={port.name}>
                        {port.name}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 mt-0.5 block">
                      {port.projectsCount} Proyectos asignados
                    </span>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1 shrink-0">
                    <PerformanceChip label="SPI" value={port.spi} />
                    <PerformanceChip label="CPI" value={port.cpi} />
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${port.healthBadge}`}>{port.healthLabel}</span>
                  </div>
                </div>

                {/* Progress Comparison with Target Pin */}
                <div className="mt-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Avance Real
                      </span>
                      <span className="text-2xl font-black text-navy">
                        <CountUpNumber value={port.metrics.avgReal} suffix="%" decimals={1} />
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Meta Prog.
                      </span>
                      <span className="text-sm font-black text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 inline-block">
                        <CountUpNumber value={port.metrics.avgScheduled} suffix="%" decimals={1} />
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        GAP
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg inline-block border ${
                        port.metrics.avgGap < -15
                          ? "bg-rose-50/90 text-rose-700 border-rose-200/70"
                          : port.metrics.avgGap < 0
                          ? "bg-amber-50/90 text-amber-800 border-amber-200/70"
                          : "bg-emerald-50/90 text-emerald-800 border-emerald-200/70"
                      }`}>
                        <CountUpNumber 
                          value={port.metrics.avgGap} 
                          prefix={port.metrics.avgGap > 0 ? "+" : ""} 
                          suffix="%" 
                          decimals={1} 
                        />
                      </span>
                    </div>
                  </div>

                  {/* Target Pin Progress Bar */}
                  <TargetProgressBar
                    real={port.metrics.avgReal}
                    scheduled={port.metrics.avgScheduled}
                    height="h-2.5"
                    showPin={true}
                    showLabels={false}
                  />
                </div>

                {/* Key Metrics Indicators */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conexión Red</span>
                    <span className="font-extrabold text-navy">
                      ⚡ {port.connectedCount} / {port.projectsCount}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recaudo Hitos</span>
                    <span className="font-extrabold text-emerald-700">
                      💰 {port.financials.effectiveness}%
                    </span>
                  </div>
                </div>

                {/* Alerts Footer within card */}
                {port.metrics.cregCriticalCount > 0 || port.metrics.criticalCount > 0 ? (
                  <div className="mt-3 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {port.metrics.cregCriticalCount > 0
                        ? `${port.metrics.cregCriticalCount} vencimientos CREG urgentes`
                        : `${port.metrics.criticalCount} proyectos con desvío crítico`}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Sin riesgos regulatorios o bloqueos críticos</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onSelectPortfolio(port.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-navy text-lemony hover:bg-navy-dark shadow-xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <span>Abrir Portafolio</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Ranking Table */}
      <div className="glass-card rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 bg-navy text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-lemony" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Tabla Resumen de Desempeño y Salud de Portafolios
            </h3>
          </div>
          <span className="text-xs text-nashville font-semibold">
            {portfolios.length} Portafolios Evaluados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold border-b border-slate-200 select-none">
                <th className="py-3 px-4">Portafolio</th>
                <th className="py-3 px-3 text-center">Proyectos</th>
                <th className="py-3 px-3 text-right">Avance Real</th>
                <th className="py-3 px-3 text-right">Avance Prog.</th>
                <th className="py-3 px-3 text-center">GAP</th>
                <th className="py-3 px-3 text-center">Conexión Red</th>
                <th className="py-3 px-3 text-center">Efectividad Cobro</th>
                <th className="py-3 px-3 text-center">Diagnóstico</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium">
              {portfolioHealthList.map((port, idx) => (
                <tr key={port.id} className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-50"}>
                  <td className="py-3 px-4 font-bold text-navy flex items-center gap-2">
                    <FolderKanban className="w-3.5 h-3.5 text-navy-light" />
                    <span>{port.name}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {port.projectsCount}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-navy">
                    {port.metrics.avgReal}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-600">
                    {port.metrics.avgScheduled}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      port.metrics.avgGap < -5
                        ? "bg-rose-100 text-rose-700"
                        : port.metrics.avgGap < 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {port.metrics.avgGap > 0 ? `+${port.metrics.avgGap}%` : `${port.metrics.avgGap}%`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    ⚡ {port.connectedCount} / {port.projectsCount}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">
                    {port.financials.effectiveness}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${port.healthBadge}`}>
                      {port.healthLabel}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectPortfolio(port.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-navy text-lemony hover:bg-navy-dark transition-all cursor-pointer"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default AnderDashboard;
