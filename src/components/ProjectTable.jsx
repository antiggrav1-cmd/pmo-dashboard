import React, { memo, useMemo, useState, useCallback } from "react";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Plus,
  X,
  SlidersHorizontal,
  Copy,
  Check,
  Download,
  FileDown,
  FileText,
  LayoutGrid,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  DollarSign,
  Wrench,
  Zap,
  RotateCcw,
  Filter
} from "lucide-react";
import { ProjectRow } from "./ProjectRow";
import { ScheduleReportModal } from "./ScheduleReportModal";
import { useTableSort } from "../hooks/useTableSort";
import { 
  calculateGap, 
  determineStatus, 
  getProjectProgressAndStatus,
  getCregRegulatoryRisk,
  getFpoScheduleRisk
} from "../utils/calculations";
import { 
  generatePortfolioScheduleSummaryText, 
  generateSingleProjectScheduleText 
} from "../utils/scheduleReportService";

const SORT_LABELS = {
  name: "Nombre del Proyecto",
  fpo: "Fecha FPO",
  cod: "Fecha COD",
  creg: "Vencimiento CREG",
  obraRealProgress: "% Avance de Obra",
  obraScheduledProgress: "% Avance de Obra Programado",
  gap: "GAP (%)",
  previousGap: "GAP Anterior (%)",
  status: "Estado del Proyecto"
};

export const ProjectTable = memo(function ProjectTable({
  projects = [],
  portfolioName = "",
  searchTerm = "",
  statusFilter = "ALL",
  onUpdateProject,
  onDeleteProject,
  onAddProject,
  onOpenProjectDetail,
  onOpenMoveProject
}) {
  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState("ALL");

  // Dynamic quick filter counts
  const quickFilterCounts = useMemo(() => {
    const counts = {
      ALL: projects.length,
      CRITICAL_GAP: 0,
      WARNING_GAP: 0,
      REGULATORY_RISK: 0,
      PENDING_BILLING: 0,
      MONTAJE: 0,
      ENERGIZADO: 0
    };

    projects.forEach((p) => {
      const { gap, status } = getProjectProgressAndStatus(p);
      const s = (status || "").toLowerCase();

      if (s.includes("atrasad") || gap < -10) {
        counts.CRITICAL_GAP++;
      }
      if (s.includes("rezago") || (gap < 0 && gap >= -10)) {
        counts.WARNING_GAP++;
      }
      const creg = getCregRegulatoryRisk(p);
      const fpo = getFpoScheduleRisk(p);
      if (creg.riskLevel === "CRITICAL" || creg.riskLevel === "WARNING" || fpo.isAtRisk) {
        counts.REGULATORY_RISK++;
      }
      const milestones = p.paymentMilestones || [];
      if (milestones.some((m) => {
        const st = (m.status || "").toLowerCase();
        return st.includes("cobrar") || st.includes("trámite") || st.includes("tramite") || st.includes("saldo pendiente");
      })) {
        counts.PENDING_BILLING++;
      }
      if ((p.connectionState || "Montaje") === "Montaje") {
        counts.MONTAJE++;
      }
      if (p.connectionState === "Energizado" || p.connectionState === "Entregado") {
        counts.ENERGIZADO++;
      }
    });

    return counts;
  }, [projects]);

  // Copy full consolidated summary report for chat
  const handleCopyConsolidatedReport = useCallback(async () => {
    const text = generatePortfolioScheduleSummaryText(projects, portfolioName);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedGeneral(true);
      setTimeout(() => setCopiedGeneral(false), 2500);
    } catch (err) {
      console.error("Error al copiar resumen general:", err);
    }
  }, [projects, portfolioName]);

  // Download consolidated report TXT
  const handleDownloadConsolidatedTxt = useCallback(() => {
    const text = generatePortfolioScheduleSummaryText(projects, portfolioName);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (portfolioName || "Portafolio").replace(/[^a-zA-Z0-9_-]/g, "_");
    const nowStr = new Date().toISOString().slice(0, 10);
    a.download = `Resumen_Cronograma_${safeName}_${nowStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projects, portfolioName]);

  // Download individual report TXT for each project
  const handleDownloadAllProjectsIndividual = useCallback(() => {
    if (projects.length === 0) return;
    projects.forEach((proj, idx) => {
      setTimeout(() => {
        const text = generateSingleProjectScheduleText(proj, portfolioName);
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = (proj.name || `Proyecto_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_");
        const nowStr = new Date().toISOString().slice(0, 10);
        a.download = `Avance_${safeName}_${nowStr}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, idx * 200);
    });
  }, [projects, portfolioName]);
  const activeSearch = searchTerm;
  const activeStatus = statusFilter;

  // Direct filtered list matching external search, status, and quick filter pills
  const filteredProjects = useMemo(() => projects.filter((proj) => {
    const term = activeSearch.trim().toLowerCase();
    const matchSearch =
      !term ||
      (proj.name && proj.name.toLowerCase().includes(term)) ||
      (proj.xm && proj.xm.toLowerCase().includes(term));

    let matchStatus = true;
    if (activeStatus !== "ALL") {
      const s = (proj.status || "").toLowerCase();
      const g = Number(proj.gap) || 0;
      if (activeStatus === "Atrasado") matchStatus = s.includes("atrasad") || g < -10;
      else if (activeStatus === "En riesgo") matchStatus = s.includes("rezago") || s.includes("riesgo") || (g < 0 && g >= -10);
      else if (activeStatus === "En tiempo") matchStatus = s.includes("tiempo") || (g >= 0 && g <= 5);
      else if (activeStatus === "Adelantado") matchStatus = s.includes("adelantad") || g > 5;
      else if (activeStatus === "Completado") matchStatus = s.includes("completad") || Number(proj.realProgress) >= 100;
    }

    let matchQuick = true;
    if (quickFilter !== "ALL") {
      const { gap, status } = getProjectProgressAndStatus(proj);
      const s = (status || "").toLowerCase();

      if (quickFilter === "CRITICAL_GAP") {
        matchQuick = s.includes("atrasad") || gap < -10;
      } else if (quickFilter === "WARNING_GAP") {
        matchQuick = s.includes("rezago") || (gap < 0 && gap >= -10);
      } else if (quickFilter === "REGULATORY_RISK") {
        const creg = getCregRegulatoryRisk(proj);
        const fpo = getFpoScheduleRisk(proj);
        matchQuick = creg.riskLevel === "CRITICAL" || creg.riskLevel === "WARNING" || fpo.isAtRisk;
      } else if (quickFilter === "PENDING_BILLING") {
        const milestones = proj.paymentMilestones || [];
        matchQuick = milestones.some((m) => {
          const st = (m.status || "").toLowerCase();
          return st.includes("cobrar") || st.includes("trámite") || st.includes("tramite") || st.includes("saldo pendiente");
        });
      } else if (quickFilter === "MONTAJE") {
        matchQuick = (proj.connectionState || "Montaje") === "Montaje";
      } else if (quickFilter === "ENERGIZADO") {
        matchQuick = proj.connectionState === "Energizado" || proj.connectionState === "Entregado";
      }
    }

    return matchSearch && matchStatus && matchQuick;
  }), [projects, activeSearch, activeStatus, quickFilter]);

  const customGetters = useMemo(() => ({
    name: (p) => p.name || "",
    fpo: (p) => p.fpo || "",
    cod: (p) => p.cod || "",
    creg: (p) => p.creg || "",
    realProgress: (p) => (p.realProgress !== "" && p.realProgress !== null && p.realProgress !== undefined) ? Number(p.realProgress) : "",
    scheduledProgress: (p) => (p.scheduledProgress !== "" && p.scheduledProgress !== null && p.scheduledProgress !== undefined) ? Number(p.scheduledProgress) : "",
    obraRealProgress: (p) => (p.obraRealProgress !== "" && p.obraRealProgress !== null && p.obraRealProgress !== undefined) ? Number(p.obraRealProgress) : "",
    obraScheduledProgress: (p) => (p.obraScheduledProgress !== "" && p.obraScheduledProgress !== null && p.obraScheduledProgress !== undefined) ? Number(p.obraScheduledProgress) : "",
    gap: (p) => getProjectProgressAndStatus(p).gap,
    previousGap: (p) => (p.previousGap !== "" && p.previousGap !== null && p.previousGap !== undefined) ? Number(p.previousGap) : "",
    status: (p) => getProjectProgressAndStatus(p).status
  }), []);

  const { sortField, sortDirection, handleSort, resetSort, sortedItems: finalProjects } = useTableSort(filteredProjects, {
    defaultField: null,
    customGetters
  });

  // Render high-visibility sort badge indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-white/30 group-hover:text-white transition-colors" />;
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-lemony text-navy font-black text-[10px] shadow-2xs">
        {sortDirection === "asc" ? <ArrowUp className="w-3 h-3 stroke-[3]" /> : <ArrowDown className="w-3 h-3 stroke-[3]" />}
        <span className="uppercase">{sortDirection === "asc" ? "Asc" : "Desc"}</span>
      </span>
    );
  };

  const getThClass = (field, extraClasses = "") => {
    const isCurrent = sortField === field;
    return `py-3 border-r border-navy-light cursor-pointer select-none transition-all group ${
      isCurrent ? "bg-navy-dark ring-inset ring-1 ring-lemony/50 text-lemony" : "hover:bg-navy-dark/60 text-white"
    } ${extraClasses}`;
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col transition-all">
      {/* Executive Schedule Share & Action Toolbar */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-navy animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-navy">
            Control de Cronograma y Avances
          </h2>
          {portfolioName && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {portfolioName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mini Informe PDF Trigger */}
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            disabled={projects.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs border ${
              projects.length > 0
                ? "bg-lemony text-navy hover:bg-lemony/80 border-lemony/40 card-hover"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
            title="Generar mini informe ejecutivo de cronograma y avances en formato PDF / Imprimible"
          >
            <FileText className="w-3.5 h-3.5 text-navy" />
            <span>Mini Informe PDF</span>
          </button>

          {/* Copy Consolidated Flash Report for WhatsApp/Teams */}
          <button
            type="button"
            onClick={handleCopyConsolidatedReport}
            disabled={projects.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              copiedGeneral
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
                : projects.length > 0
                ? "bg-navy text-lemony hover:bg-navy-dark shadow-xs card-hover"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
            title="Copiar resumen ejecutivo del portafolio con comparativa de todos los proyectos y conclusiones del PMO"
          >
            {copiedGeneral ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-black">¡Resumen Copiado para Chat!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-lemony" />
                <span>Copiar Resumen General</span>
              </>
            )}
          </button>

          {/* Download Consolidated TXT */}
          <button
            type="button"
            onClick={handleDownloadConsolidatedTxt}
            disabled={projects.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              projects.length > 0
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs card-hover"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
            title="Descargar informe consolidado de cronograma en archivo .txt"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Descargar .TXT General</span>
          </button>

          {/* Download Individual TXT per Project */}
          <button
            type="button"
            onClick={handleDownloadAllProjectsIndividual}
            disabled={projects.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              projects.length > 0
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs card-hover"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
            title="Descarga 1 archivo .txt individual e independiente por cada proyecto"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Descargar .TXT (1 por proyecto)</span>
            <span className="sm:hidden">1 por proyecto</span>
          </button>
        </div>
      </div>

      {/* Smart Quick Filter Chips (Opción 3) */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5 text-navy" />
            <span>Filtro Rápido:</span>
          </div>

          {/* 1. Todos */}
          <button
            type="button"
            onClick={() => setQuickFilter("ALL")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "ALL"
                ? "bg-navy text-lemony border-navy shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "ALL" ? "bg-lemony text-navy" : "bg-slate-100 text-slate-600"
            }`}>
              {quickFilterCounts.ALL}
            </span>
          </button>

          {/* 2. Atraso Crítico */}
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "CRITICAL_GAP" ? "ALL" : "CRITICAL_GAP")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "CRITICAL_GAP"
                ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
            }`}
            title="Proyectos con GAP menor a -10% o estado Atrasado Crítico"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Atraso Crítico</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "CRITICAL_GAP" ? "bg-white text-rose-700" : "bg-rose-100 text-rose-700"
            }`}>
              {quickFilterCounts.CRITICAL_GAP}
            </span>
          </button>

          {/* 3. Rezago Leve */}
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "WARNING_GAP" ? "ALL" : "WARNING_GAP")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "WARNING_GAP"
                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50"
            }`}
            title="Proyectos con GAP entre 0% y -10%"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Rezago Leve</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "WARNING_GAP" ? "bg-white text-amber-700" : "bg-amber-100 text-amber-800"
            }`}>
              {quickFilterCounts.WARNING_GAP}
            </span>
          </button>

          {/* 4. Riesgo CREG / FPO */}
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "REGULATORY_RISK" ? "ALL" : "REGULATORY_RISK")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "REGULATORY_RISK"
                ? "bg-orange-600 text-white border-orange-700 shadow-xs"
                : "bg-white text-orange-800 border-orange-200 hover:bg-orange-50"
            }`}
            title="Proyectos con riesgo de vencimiento CREG o FPO"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Riesgo CREG/FPO</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "REGULATORY_RISK" ? "bg-white text-orange-800" : "bg-orange-100 text-orange-800"
            }`}>
              {quickFilterCounts.REGULATORY_RISK}
            </span>
          </button>

          {/* 5. Hitos por Cobrar */}
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "PENDING_BILLING" ? "ALL" : "PENDING_BILLING")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "PENDING_BILLING"
                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
            }`}
            title="Proyectos con hitos en trámite o pendientes de facturación"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Hitos por Cobrar</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "PENDING_BILLING" ? "bg-white text-emerald-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              {quickFilterCounts.PENDING_BILLING}
            </span>
          </button>

          {/* 6. En Montaje */}
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "MONTAJE" ? "ALL" : "MONTAJE")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "MONTAJE"
                ? "bg-sky-600 text-white border-sky-700 shadow-xs"
                : "bg-white text-sky-800 border-sky-200 hover:bg-sky-50"
            }`}
            title="Proyectos en etapa de montaje"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Montaje</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "MONTAJE" ? "bg-white text-sky-800" : "bg-sky-100 text-sky-800"
            }`}>
              {quickFilterCounts.MONTAJE}
            </span>
          </button>

          {/* 7. Energizados */}
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "ENERGIZADO" ? "ALL" : "ENERGIZADO")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === "ENERGIZADO"
                ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                : "bg-white text-purple-800 border-purple-200 hover:bg-purple-50"
            }`}
            title="Proyectos energizados o entregados"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Energizados</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              quickFilter === "ENERGIZADO" ? "bg-white text-purple-800" : "bg-purple-100 text-purple-800"
            }`}>
              {quickFilterCounts.ENERGIZADO}
            </span>
          </button>
        </div>

        {/* Reset filter button if active */}
        {quickFilter !== "ALL" && (
          <button
            type="button"
            onClick={() => setQuickFilter("ALL")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer shrink-0"
            title="Quitar filtro rápido y mostrar todos"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>
        )}
      </div>

      {/* Active Sort Bar (Visible when sorting is applied) */}
      {sortField && (
        <div className="bg-navy-dark/95 border-b border-navy-light px-4 py-2 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Orden activo:</span>
            <span className="font-bold text-lemony bg-navy px-2.5 py-0.5 rounded-full border border-lemony/30">
              {SORT_LABELS[sortField] || sortField}
            </span>
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
              {sortDirection === "asc" ? "▲ De menor a mayor / Más antiguo" : "▼ De mayor a menor / Más reciente"}
            </span>
          </div>
          <button
            type="button"
            onClick={resetSort}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-rose-500 hover:text-white text-slate-200 transition-all cursor-pointer shadow-2xs"
            title="Quitar criterio de orden y volver al orden original"
          >
            <X className="w-3 h-3" />
            <span>Restablecer orden</span>
          </button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[1280px]">
          <thead className="sticky top-0 z-10 bg-navy shadow-sm">
            <tr className="bg-navy text-white text-[12px] font-semibold select-none shadow-xs">
              {/* Proyecto: Flexible (Primera Columna) */}
              <th onClick={() => handleSort("name")} className={getThClass("name", "px-3 text-left min-w-[210px]")} title="Clic para ordenar por Proyecto">
                <div className="flex items-center justify-between">
                  <span>Proyecto</span>
                  {renderSortIndicator("name")}
                </div>
              </th>

              {/* FPO: 125px */}
              <th onClick={() => handleSort("fpo")} className={getThClass("fpo", "px-2 text-center w-[125px]")} title="Clic para ordenar por Fecha FPO">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 opacity-80" />
                  <span>FPO</span>
                  {renderSortIndicator("fpo")}
                </div>
              </th>

              {/* COD: 125px */}
              <th onClick={() => handleSort("cod")} className={getThClass("cod", "px-2 text-center w-[125px]")} title="Clic para ordenar por Fecha COD">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 opacity-80" />
                  <span>COD</span>
                  {renderSortIndicator("cod")}
                </div>
              </th>

              {/* Ven. CREG: 130px */}
              <th onClick={() => handleSort("creg")} className={getThClass("creg", "px-2 text-center w-[130px]")} title="Clic para ordenar por Vencimiento CREG">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 opacity-80" />
                  <span>Ven. CREG</span>
                  {renderSortIndicator("creg")}
                </div>
              </th>

              {/* % Avance de Obra: 120px */}
              <th onClick={() => handleSort("obraRealProgress")} className={getThClass("obraRealProgress", "px-2 text-right w-[120px]")} title="Clic para ordenar por % Avance de Obra">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-bold text-lemony">%</span>
                  <span className="leading-tight text-right">avance de obra</span>
                  {renderSortIndicator("obraRealProgress")}
                </div>
              </th>

              {/* % Avance de Obra Programado: 140px */}
              <th onClick={() => handleSort("obraScheduledProgress")} className={getThClass("obraScheduledProgress", "px-2 text-right w-[140px]")} title="Clic para ordenar por % Avance de Obra Programado">
                <div className="flex items-center justify-end gap-1">
                  <span className="leading-tight text-right">% avance de obra programado</span>
                  {renderSortIndicator("obraScheduledProgress")}
                </div>
              </th>

              {/* GAP: 85px */}
              <th onClick={() => handleSort("gap")} className={getThClass("gap", "px-2 text-center w-[85px]")} title="Clic para ordenar por GAP (%)">
                <div className="flex items-center justify-center gap-1">
                  <span>GAP (%)</span>
                  {renderSortIndicator("gap")}
                </div>
              </th>

              {/* GAP anterior: 85px */}
              <th onClick={() => handleSort("previousGap")} className={getThClass("previousGap", "px-2 text-center w-[85px]")} title="Clic para ordenar por GAP Anterior">
                <div className="flex items-center justify-center gap-1">
                  <span>GAP Ant</span>
                  {renderSortIndicator("previousGap")}
                </div>
              </th>

              {/* Estado: 110px */}
              <th onClick={() => handleSort("status")} className={getThClass("status", "px-2 text-center w-[110px]")} title="Clic para ordenar por Estado">
                <div className="flex items-center justify-center gap-1">
                  <span>Estado</span>
                  {renderSortIndicator("status")}
                </div>
              </th>

              {/* Acción: 75px */}
              <th className="py-3 px-1.5 text-center w-[75px] text-white">
                <span>Acción</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-[13px]">
            {finalProjects.map((project, idx) => (
              <ProjectRow
                key={project.id}
                project={project}
                portfolioName={portfolioName}
                isEven={idx % 2 === 0}
                onUpdateProject={onUpdateProject}
                onDeleteProject={onDeleteProject}
                onOpenProjectDetail={onOpenProjectDetail}
                onOpenMoveProject={onOpenMoveProject}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={onAddProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-navy text-lemony hover:bg-navy-dark shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Agregar Proyecto</span>
        </button>
        <div className="text-xs text-slate-500 font-medium flex items-center gap-4">
          <span>Mostrando: <b>{finalProjects.length}</b> / <b>{projects.length}</b> proyectos</span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline">GAP = Avance de Obra Real − Avance de Obra Programado</span>
        </div>
      </div>

      <ScheduleReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        projects={projects}
        portfolioName={portfolioName}
      />
    </div>
  );
});
