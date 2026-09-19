import React, { memo, useMemo } from "react";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Plus,
  X,
  ArrowDownAZ,
  ArrowUpAZ,
  SlidersHorizontal
} from "lucide-react";
import { ProjectRow } from "./ProjectRow";
import { useTableSort } from "../hooks/useTableSort";
import { calculateGap, determineStatus } from "../utils/calculations";

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
  searchTerm = "",
  statusFilter = "ALL",
  onUpdateProject,
  onDeleteProject,
  onAddProject,
  onOpenProjectDetail
}) {
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
      if (activeStatus === "Atrasado") matchStatus = s.includes("atrasad") || g < -15;
      else if (activeStatus === "En riesgo") matchStatus = s.includes("rezago") || (g < -5 && g >= -15);
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

              {/* Acción: 40px */}
              <th className="py-3 px-1.5 text-center w-[40px] text-white">
                <span>Acción</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-[13px]">
            {finalProjects.map((project, idx) => (
              <ProjectRow
                key={project.id}
                project={project}
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
