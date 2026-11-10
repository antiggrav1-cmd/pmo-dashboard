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
  Activity,
  HardHat,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ProjectRow } from "./ProjectRow";
import { ScheduleReportModal } from "./ScheduleReportModal";
import { useTableSort } from "../hooks/useTableSort";
import { calculateGap, determineStatus, getProjectProgressAndStatus } from "../utils/calculations";
import { 
  generatePortfolioScheduleSummaryText, 
  generateSingleProjectScheduleText 
} from "../utils/scheduleReportService";

const SORT_LABELS = {
  name: "Nombre del Proyecto",
  fpo: "Fecha FPO",
  cod: "Fecha COD",
  creg: "Vencimiento CREG",
  realProgress: "% General Real",
  scheduledProgress: "% Real Programado",
  obraRealProgress: "% Obra Real",
  obraScheduledProgress: "% Obra Programado",
  gap: "Gap de Obra (%)",
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
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(true);
  const [isObraExpanded, setIsObraExpanded] = useState(true);

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
            {/* Fila 1: Grupos y Columnas Principales */}
            <tr className="bg-navy text-white text-[11px] font-bold select-none border-b border-navy-light/60">
              {/* Proyecto: rowSpan=2 */}
              <th rowSpan={2} onClick={() => handleSort("name")} className={getThClass("name", "px-3 text-left min-w-[210px] align-bottom pb-2.5")} title="Clic para ordenar por Proyecto">
                <div className="flex items-center justify-between">
                  <span>Proyecto</span>
                  {renderSortIndicator("name")}
                </div>
              </th>

              {/* FPO: rowSpan=2 */}
              <th rowSpan={2} onClick={() => handleSort("fpo")} className={getThClass("fpo", "px-2 text-center w-[115px] align-bottom pb-2.5")} title="Clic para ordenar por Fecha FPO">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 opacity-80" />
                  <span>FPO</span>
                  {renderSortIndicator("fpo")}
                </div>
              </th>

              {/* COD: rowSpan=2 */}
              <th rowSpan={2} onClick={() => handleSort("cod")} className={getThClass("cod", "px-2 text-center w-[115px] align-bottom pb-2.5")} title="Clic para ordenar por Fecha COD">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 opacity-80" />
                  <span>COD</span>
                  {renderSortIndicator("cod")}
                </div>
              </th>

              {/* Ven. CREG: rowSpan=2 */}
              <th rowSpan={2} onClick={() => handleSort("creg")} className={getThClass("creg", "px-2 text-center w-[120px] align-bottom pb-2.5")} title="Clic para ordenar por Vencimiento CREG">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 opacity-80" />
                  <span>Ven. CREG</span>
                  {renderSortIndicator("creg")}
                </div>
              </th>

              {/* GRUPO 1: Avance General / Cronograma */}
              <th 
                colSpan={isGeneralExpanded ? 2 : 1} 
                className="py-1.5 px-2.5 border-r border-navy-light bg-sky-950/80 border-b border-sky-400/40 text-center"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-200 truncate">
                      Avance General
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsGeneralExpanded((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-900/90 hover:bg-sky-800 text-sky-200 border border-sky-700/60 transition-all cursor-pointer shadow-2xs"
                    title={isGeneralExpanded ? "Contraer: ocultar % Real Programado" : "Expandir: mostrar % Real Programado"}
                  >
                    {isGeneralExpanded ? (
                      <>
                        <ChevronLeft className="w-3 h-3 text-sky-300" />
                        <span className="hidden md:inline">Contraer</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-3 h-3 text-sky-300" />
                        <span className="hidden md:inline">Expandir</span>
                      </>
                    )}
                  </button>
                </div>
              </th>

              {/* GRUPO 2: Avance de Obra */}
              <th 
                colSpan={isObraExpanded ? 3 : 2} 
                className="py-1.5 px-2.5 border-r border-navy-light bg-amber-950/80 border-b border-amber-400/40 text-center"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HardHat className="w-3.5 h-3.5 text-lemony shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-lemony truncate">
                      Avance de Obra
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsObraExpanded((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/90 hover:bg-amber-800 text-lemony border border-amber-700/60 transition-all cursor-pointer shadow-2xs"
                    title={isObraExpanded ? "Contraer: ocultar % Obra Programado" : "Expandir: mostrar % Obra Programado"}
                  >
                    {isObraExpanded ? (
                      <>
                        <ChevronLeft className="w-3 h-3 text-lemony" />
                        <span className="hidden md:inline">Contraer</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-3 h-3 text-lemony" />
                        <span className="hidden md:inline">Expandir</span>
                      </>
                    )}
                  </button>
                </div>
              </th>

              {/* GAP Anterior: rowSpan=2 */}
              <th rowSpan={2} onClick={() => handleSort("previousGap")} className={getThClass("previousGap", "px-2 text-center w-[85px] align-bottom pb-2.5")} title="Clic para ordenar por GAP Anterior">
                <div className="flex items-center justify-center gap-1">
                  <span>GAP Ant</span>
                  {renderSortIndicator("previousGap")}
                </div>
              </th>

              {/* Estado: rowSpan=2 */}
              <th rowSpan={2} onClick={() => handleSort("status")} className={getThClass("status", "px-2 text-center w-[110px] align-bottom pb-2.5")} title="Clic para ordenar por Estado">
                <div className="flex items-center justify-center gap-1">
                  <span>Estado</span>
                  {renderSortIndicator("status")}
                </div>
              </th>

              {/* Acción: rowSpan=2 */}
              <th rowSpan={2} className="py-3 px-1.5 text-center w-[75px] text-white align-bottom pb-2.5">
                <span>Acción</span>
              </th>
            </tr>

            {/* Fila 2: Sub-encabezados de los grupos */}
            <tr className="bg-navy text-white text-[11px] font-semibold select-none shadow-xs border-b border-navy-light">
              {/* Sub 1: % General Real */}
              <th 
                onClick={() => handleSort("realProgress")} 
                className={getThClass("realProgress", "px-2 text-right w-[95px] bg-sky-950/40")} 
                title="Clic para ordenar por % General Real"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className="text-sky-300 font-bold">% Gen. Real</span>
                  {renderSortIndicator("realProgress")}
                </div>
              </th>

              {/* Sub 2: % Real Programado (si está expandido) */}
              {isGeneralExpanded && (
                <th 
                  onClick={() => handleSort("scheduledProgress")} 
                  className={getThClass("scheduledProgress", "px-2 text-right w-[95px] bg-sky-950/40")} 
                  title="Clic para ordenar por % Real Programado"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-sky-200">% Prog</span>
                    {renderSortIndicator("scheduledProgress")}
                  </div>
                </th>
              )}

              {/* Sub 3: % Obra Real */}
              <th 
                onClick={() => handleSort("obraRealProgress")} 
                className={getThClass("obraRealProgress", "px-2 text-right w-[105px] bg-amber-950/40")} 
                title="Clic para ordenar por % Obra Real"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className="font-bold text-lemony">% Obra Real</span>
                  {renderSortIndicator("obraRealProgress")}
                </div>
              </th>

              {/* Sub 4: % Obra Programado (si está expandido) */}
              {isObraExpanded && (
                <th 
                  onClick={() => handleSort("obraScheduledProgress")} 
                  className={getThClass("obraScheduledProgress", "px-2 text-right w-[110px] bg-amber-950/40")} 
                  title="Clic para ordenar por % Obra Programado"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-amber-200">% Obra Prog</span>
                    {renderSortIndicator("obraScheduledProgress")}
                  </div>
                </th>
              )}

              {/* Sub 5: Gap de Obra */}
              <th 
                onClick={() => handleSort("gap")} 
                className={getThClass("gap", "px-2 text-center w-[85px] bg-amber-950/40")} 
                title="Clic para ordenar por Gap de Obra (%)"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-white">Gap Obra</span>
                  {renderSortIndicator("gap")}
                </div>
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
                isGeneralExpanded={isGeneralExpanded}
                isObraExpanded={isObraExpanded}
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
          <span className="hidden sm:inline font-semibold">Gap de Obra = % Obra Real − % Obra Programado</span>
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
