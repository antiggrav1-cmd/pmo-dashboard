import React, { useState, useMemo, memo } from "react";
import { 
  Sun, 
  Sliders, 
  Box, 
  Cpu, 
  Zap, 
  Search,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUS_OPTIONS } from "../utils/equipmentConstants";
import { getFullEquipmentMetrics } from "../services/equipmentService";
import { EquipmentRow } from "./EquipmentRow";
import { useTableSort } from "../hooks/useTableSort";

const STATUS_RANK_MAP = EQUIPMENT_STATUS_OPTIONS.reduce((acc, opt, idx) => {
  acc[opt.label.toLowerCase()] = idx;
  return acc;
}, {});

export const EquipmentTable = memo(function EquipmentTable({
  projects = [],
  portfolioName = "",
  onUpdateProject
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const getEquipmentIcon = (typeId) => {
    switch (typeId) {
      case "paneles":      return <Sun     className="w-3.5 h-3.5 text-lemony" />;
      case "trackers":     return <Sliders className="w-3.5 h-3.5 text-nashville" />;
      case "shelter":      return <Box     className="w-3.5 h-3.5 text-purple-400" />;
      case "inversores":   return <Cpu     className="w-3.5 h-3.5 text-nashville" />;
      case "reconectador": return <Zap     className="w-3.5 h-3.5 text-lemony" />;
      default:             return <Layers  className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Filter projects by search term (Memoized)
  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) => p.name && p.name.toLowerCase().includes(term));
  }, [projects, searchTerm]);

  // Sort hook with custom getters for equipment types with status ranking
  const customGetters = useMemo(() => ({
    name: (p) => p.name || "",
    paneles: (p) => {
      const s = p.equipment?.paneles?.status || "";
      return s ? (STATUS_RANK_MAP[s.toLowerCase()] ?? s) : "";
    },
    trackers: (p) => {
      const s = p.equipment?.trackers?.status || "";
      return s ? (STATUS_RANK_MAP[s.toLowerCase()] ?? s) : "";
    },
    shelter: (p) => {
      const s = p.equipment?.shelter?.status || "";
      return s ? (STATUS_RANK_MAP[s.toLowerCase()] ?? s) : "";
    },
    inversores: (p) => {
      const s = p.equipment?.inversores?.status || "";
      return s ? (STATUS_RANK_MAP[s.toLowerCase()] ?? s) : "";
    },
    reconectador: (p) => {
      const s = p.equipment?.reconectador?.status || "";
      return s ? (STATUS_RANK_MAP[s.toLowerCase()] ?? s) : "";
    }
  }), []);

  const { sortField, sortDirection, handleSort, resetSort, sortedItems: sortedProjects } = useTableSort(filteredProjects, {
    defaultField: null,
    customGetters
  });

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

  const getColumnName = (field) => {
    if (field === "name") return "Proyecto";
    const eq = EQUIPMENT_TYPES.find((e) => e.id === field);
    return eq ? eq.name : field;
  };

  // Aggregated metrics across equipment types (Memoized)
  const equipmentMetrics = useMemo(() => {
    return getFullEquipmentMetrics(projects);
  }, [projects]);

  return (
    <div className="space-y-5">
      {/* 5 Equipment Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {equipmentMetrics.map(({ type, summary }) => (
          <div
            key={type.id}
            className="glass-card p-4 rounded-2xl border border-slate-200/80 shadow-xs card-hover flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {getEquipmentIcon(type.id)}
                <span className="text-xs font-bold uppercase tracking-wider text-navy">
                  {type.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                {summary.enSitio}/{summary.total}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-navy">{summary.enSitio} en sitio</span>
                {summary.retrasado > 0 ? (
                  <span className="text-rose-600 font-bold">⚠️ {summary.retrasado}</span>
                ) : (
                  <span className="text-slate-400">{summary.enTransito} tránsito</span>
                )}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-navy rounded-full transition-all duration-300"
                  style={{ width: `${summary.percentageOnSite}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Equipment Matrix Table */}
      <div className="glass-card rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col transition-all">
        {/* Table Top Controls */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-navy">
            Matriz de Equipos Principales — {portfolioName}
          </span>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Active Sort Bar (Visible when sorting is applied) */}
        {sortField && (
          <div className="bg-navy-dark/95 border-b border-navy-light px-4 py-2 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium">Orden activo:</span>
              <span className="font-bold text-lemony bg-navy px-2.5 py-0.5 rounded-full border border-lemony/30">
                {getColumnName(sortField)}
              </span>
              <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                {sortDirection === "asc" ? "▲ De menor avance a mayor avance en cadena de suministro" : "▼ De mayor avance a menor avance en cadena de suministro"}
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

        {/* Matrix Table with Sticky Header */}
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-navy shadow-sm">
              <tr className="bg-navy text-white text-[12px] font-semibold select-none">
                <th
                  onClick={() => handleSort("name")}
                  className={getThClass("name", "px-3.5 w-[180px]")}
                  title="Clic para ordenar por Proyecto"
                >
                  <div className="flex items-center justify-between">
                    <span>Proyecto</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                {EQUIPMENT_TYPES.map((eq) => (
                  <th
                    key={eq.id}
                    onClick={() => handleSort(eq.id)}
                    className={getThClass(eq.id, "px-3 min-w-[185px]")}
                    title={`Clic para ordenar por estado de ${eq.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getEquipmentIcon(eq.id)}
                        <span>{eq.name}</span>
                      </div>
                      {renderSortIndicator(eq.id)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {sortedProjects.map((project, idx) => (
                <EquipmentRow
                  key={project.id}
                  project={project}
                  isEven={idx % 2 === 0}
                  onUpdateProject={onUpdateProject}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer Guide */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Estados disponibles:</span>
            {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
              <span key={opt.label} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                <span className={`w-2 h-2 rounded-full ${opt.dot}`}></span>
                <span>{opt.label}</span>
              </span>
            ))}
          </div>

          <span className="text-[11px] text-slate-400">
            * Los cambios se guardan automáticamente
          </span>
        </div>
      </div>
    </div>
  );
});
