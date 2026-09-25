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
  FileDown
} from "lucide-react";
import { ProjectRow } from "./ProjectRow";
import { useTableSort } from "../hooks/useTableSort";
import { calculateGap, determineStatus } from "../utils/calculations";
import { 
  generatePortfolioScheduleSummaryText, 
  generateSingleProjectScheduleText 
} from "../utils/scheduleReportService";

const SORT_LABELS = {
  xm: "Archivo XM",
  name: "Nombre del Proyecto",
  fpo: "Fecha FPO",
  cod: "Fecha COD",
  creg: "Vencimiento CREG",
  realProgress: "% Avance Real",
  scheduledProgress: "% Avance Programado",
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
  onOpenProjectDetail
}) {
  const [copiedGeneral, setCopiedGeneral] = useState(false);

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

  // Direct filtered list matching external search/status
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
    return matchSearch && matchStatus;
  }), [projects, activeSearch, activeStatus]);

  const customGetters = useMemo(() => ({
    xm: (p) => p.xm || "",
    name: (p) => p.name || "",
    fpo: (p) => p.fpo || "",
    cod: (p) => p.cod || "",
    creg: (p) => p.creg || "",
    realProgress: (p) => (p.realProgress !== "" && p.realProgress !== null && p.realProgress !== undefined) ? Number(p.realProgress) : "",
    scheduledProgress: (p) => (p.scheduledProgress !== "" && p.scheduledProgress !== null && p.scheduledProgress !== undefined) ? Number(p.scheduledProgress) : "",
    gap: (p) => {
      const real = Number(p.realProgress) || 0;
      const sched = Number(p.scheduledProgress) || 0;
      return calculateGap(real, sched);
    },
    previousGap: (p) => (p.previousGap !== "" && p.previousGap !== null && p.previousGap !== undefined) ? Number(p.previousGap) : "",
    status: (p) => {
      const real = Number(p.realProgress) || 0;
      const sched = Number(p.scheduledProgress) || 0;
      const calculatedGap = calculateGap(real, sched);
      return determineStatus(calculatedGap, real);
    }
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
        <table className="w-full text-left border-collapse min-w-[1150px]">
          <thead className="sticky top-0 z-10 bg-navy shadow-sm">
            <tr className="bg-navy text-white text-[12px] font-semibold select-none shadow-xs">
              {/* Ficha: 40px (Far Left) */}
              <th className="py-3 px-1 text-center w-[40px] text-white border-r border-navy-light" title="Ficha del Proyecto">
                <SlidersHorizontal className="w-3.5 h-3.5 mx-auto text-lemony" />
              </th>

              {/* XM: 200px */}
              <th onClick={() => handleSort("xm")} className={getThClass("xm", "px-3 text-left w-[200px]")} title="Clic para ordenar por archivo XM">
                <div className="flex items-center justify-between">
                  <span>XM</span>
                  {renderSortIndicator("xm")}
                </div>
              </th>

              {/* Proyecto: Flexible */}
              <th onClick={() => handleSort("name")} className={getThClass("name", "px-3 text-left min-w-[190px]")} title="Clic para ordenar por Proyecto">
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

              {/* Avance Real: 95px */}
              <th onClick={() => handleSort("realProgress")} className={getThClass("realProgress", "px-2 text-right w-[95px]")} title="Clic para ordenar por % Avance Real">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-bold text-lemony">%</span>
                  <span>Avance</span>
                  {renderSortIndicator("realProgress")}
                </div>
              </th>

              {/* Avance Prog: 95px */}
              <th onClick={() => handleSort("scheduledProgress")} className={getThClass("scheduledProgress", "px-2 text-right w-[95px]")} title="Clic para ordenar por % Avance Programado">
                <div className="flex items-center justify-end gap-1">
                  <span>Prog (%)</span>
                  {renderSortIndicator("scheduledProgress")}
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

              {/* Acción: 70px */}
              <th className="py-3 px-1.5 text-center w-[70px] text-white">
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
          <span className="hidden sm:inline">GAP = Avance Real − Avance Programado</span>
        </div>
      </div>
    </div>
  );
});
