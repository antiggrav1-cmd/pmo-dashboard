import React, { memo, useCallback } from "react";
import { Trash2, SlidersHorizontal, FolderInput } from "lucide-react";
import { EditableTextCell } from "./cells/EditableTextCell";
import { EditableDateCell } from "./cells/EditableDateCell";
import { EditableNumberCell } from "./cells/EditableNumberCell";
import { StatusBadge, GapBadge } from "./StatusBadge";
import { calculateGap, determineStatus, getProjectProgressAndStatus } from "../utils/calculations";
import { CONNECTION_STATES } from "../models/projectModel";

const CONNECTION_STATE_STYLES = {
  "DD":         { bg: "bg-purple-100",  text: "text-purple-800", hover: "hover:bg-purple-200", emoji: "📋" },
  "Ingeniería": { bg: "bg-sky-100",     text: "text-sky-800",    hover: "hover:bg-sky-200",    emoji: "📐" },
  "Montaje":    { bg: "bg-slate-100",   text: "text-slate-700",  hover: "hover:bg-slate-200",  emoji: "🔧" },
  "Energizado": { bg: "bg-amber-100",   text: "text-amber-800",  hover: "hover:bg-amber-200",  emoji: "⚡" },
  "Entregado":  { bg: "bg-emerald-100", text: "text-emerald-800",hover: "hover:bg-emerald-200",emoji: "✅" },
};

export const ProjectRow = memo(function ProjectRow({
  project,
  portfolioName = "",
  isEven = false,
  isGeneralExpanded = true,
  isObraExpanded = true,
  onUpdateProject,
  onDeleteProject,
  onOpenProjectDetail,
  onOpenMoveProject
}) {
  const handleFieldUpdate = useCallback((field, value) => {
    let updated = { ...project, [field]: value };

    if (
      field === "obraRealProgress" ||
      field === "obraScheduledProgress"
    ) {
      const metrics = getProjectProgressAndStatus(updated);
      updated.gap = metrics.gap;
      updated.status = metrics.status;
    }

    onUpdateProject(updated);
  }, [project, onUpdateProject]);

  const { gap: calculatedGap, status: currentStatus } = getProjectProgressAndStatus(project);

  // 3-state connection cycle
  const connState = project.connectionState || "Ingeniería";
  const connStyle = CONNECTION_STATE_STYLES[connState] || CONNECTION_STATE_STYLES["Montaje"];
  const handleCycleConnectionState = useCallback(() => {
    const idx = CONNECTION_STATES.indexOf(connState);
    const next = CONNECTION_STATES[(idx + 1) % CONNECTION_STATES.length];
    onUpdateProject({
      ...project,
      connectionState: next,
      gridConnected: next === "Energizado" || next === "Entregado",
      gridConnectionDate:
        next === "Energizado" || next === "Entregado"
          ? project.gridConnectionDate || new Date().toISOString().slice(0, 10)
          : project.gridConnectionDate
    });
  }, [connState, onUpdateProject, project]);

  return (
    <tr className={`hover:bg-slate-50 transition-colors group ${isEven ? "bg-white" : "bg-slate-50/50"}`}>
      {/* 1. Proyecto Name + Ficha Button + Connection State Cycle Button (Primera Columna) */}
      <td className="p-1.5 border-r border-slate-200">
        <div className="flex items-center gap-1.5">
          {onOpenProjectDetail && (
            <button
              type="button"
              onClick={() => onOpenProjectDetail(project)}
              className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-200/70 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs group-hover:text-navy"
              title="Abrir Ficha del Proyecto (Datos generales y financieros)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
          <EditableTextCell
            value={project.name}
            onChange={(val) => handleFieldUpdate("name", val)}
            placeholder="Nombre del proyecto..."
            className="font-semibold text-slate-800"
          />
          <button
            type="button"
            onClick={handleCycleConnectionState}
            title={`Estado: ${connState} — Clic para avanzar al siguiente estado`}
            className={`shrink-0 px-1.5 py-0.5 rounded-lg text-[9px] font-black transition-all cursor-pointer flex items-center gap-0.5 ${connStyle.bg} ${connStyle.text} ${connStyle.hover}`}
          >
            <span>{connStyle.emoji}</span>
            <span className="hidden xl:inline">{connState}</span>
          </button>
        </div>
      </td>

      {/* 2. FPO Date */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableDateCell
          value={project.fpo}
          onChange={(val) => handleFieldUpdate("fpo", val)}
        />
      </td>

      {/* 3. COD Date */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableDateCell
          value={project.cod}
          onChange={(val) => handleFieldUpdate("cod", val)}
        />
      </td>

      {/* 4. Ven. CREG Date */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableDateCell
          value={project.creg}
          onChange={(val) => handleFieldUpdate("creg", val)}
        />
      </td>

      {/* --- GRUPO 1: AVANCE GENERAL / CRONOGRAMA --- */}
      {/* 5. % General Real */}
      <td className="p-1.5 border-r border-slate-200 text-right bg-sky-50/20">
        <EditableNumberCell
          value={project.realProgress}
          onChange={(val) => handleFieldUpdate("realProgress", val)}
          min={0}
          max={100}
          className="w-16 font-bold text-sky-950"
          align="right"
        />
      </td>

      {/* 6. % Real Programado (Secundaria: visible solo si Avance General está expandido) */}
      {isGeneralExpanded && (
        <td className="p-1.5 border-r border-slate-200 text-right bg-sky-50/20">
          <EditableNumberCell
            value={project.scheduledProgress}
            onChange={(val) => handleFieldUpdate("scheduledProgress", val)}
            min={0}
            max={100}
            className="w-16 text-slate-700"
            align="right"
          />
        </td>
      )}

      {/* --- GRUPO 2: AVANCE DE OBRA --- */}
      {/* 7. % Obra Real */}
      <td className="p-1.5 border-r border-slate-200 text-right bg-amber-50/20">
        <EditableNumberCell
          value={project.obraRealProgress}
          onChange={(val) => handleFieldUpdate("obraRealProgress", val)}
          min={0}
          max={100}
          className="w-16 font-bold text-slate-900"
          align="right"
        />
      </td>

      {/* 8. % Obra Programado (Secundaria: visible solo si Avance de Obra está expandido) */}
      {isObraExpanded && (
        <td className="p-1.5 border-r border-slate-200 text-right bg-amber-50/20">
          <EditableNumberCell
            value={project.obraScheduledProgress}
            onChange={(val) => handleFieldUpdate("obraScheduledProgress", val)}
            min={0}
            max={100}
            className="w-16 text-slate-700"
            align="right"
          />
        </td>
      )}

      {/* 9. Gap de Obra — calculado exclusivamente con Avance de Obra */}
      <td className="p-1.5 border-r border-slate-200 text-center bg-amber-50/20">
        <GapBadge gap={calculatedGap} previousGap={project.previousGap} />
      </td>

      {/* --- COLUMNAS DE SEGUIMIENTO --- */}
      {/* 10. GAP Anterior — centered & compact */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableNumberCell
          value={project.previousGap}
          onChange={(val) => handleFieldUpdate("previousGap", val)}
          placeholder="0.0"
          className="w-16 text-slate-600"
          align="center"
        />
      </td>

      {/* 9. Estado — auto calculated */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <StatusBadge status={currentStatus} />
      </td>

      {/* 10. Action: Move Portfolio & Delete */}
      <td className="p-1.5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {onOpenMoveProject && (
            <button
              type="button"
              onClick={() => onOpenMoveProject(project)}
              className="p-1 text-slate-400 hover:text-navy hover:bg-slate-200/70 rounded transition-all cursor-pointer"
              title={`Mover "${project.name || 'este proyecto'}" a otro portafolio`}
            >
              <FolderInput className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteProject(project)}
            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Eliminar fila"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
