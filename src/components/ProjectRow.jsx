import React, { memo, useCallback, useState } from "react";
import { Trash2, SlidersHorizontal, Copy, Check } from "lucide-react";
import { XmCell } from "./cells/XmCell";
import { EditableTextCell } from "./cells/EditableTextCell";
import { EditableDateCell } from "./cells/EditableDateCell";
import { EditableNumberCell } from "./cells/EditableNumberCell";
import { StatusBadge, GapBadge } from "./StatusBadge";
import { calculateGap, determineStatus } from "../utils/calculations";
import { generateSingleProjectScheduleText } from "../utils/scheduleReportService";
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
  onUpdateProject,
  onDeleteProject,
  onOpenProjectDetail
}) {
  const [copiedSingle, setCopiedSingle] = useState(false);

  const handleCopySingleReport = useCallback(async () => {
    const textContent = generateSingleProjectScheduleText(project, portfolioName);
    try {
      await navigator.clipboard.writeText(textContent);
      setCopiedSingle(true);
      setTimeout(() => setCopiedSingle(false), 2000);
    } catch (err) {
      console.error("Error al copiar reporte individual:", err);
    }
  }, [project, portfolioName]);
  const handleFieldUpdate = useCallback((field, value) => {
    let updated = { ...project, [field]: value };

    if (field === "realProgress" || field === "scheduledProgress") {
      const real = field === "realProgress" ? Number(value) || 0 : Number(project.realProgress) || 0;
      const sched = field === "scheduledProgress" ? Number(value) || 0 : Number(project.scheduledProgress) || 0;
      const calculatedGap = calculateGap(real, sched);
      updated.gap = calculatedGap;
      updated.status = determineStatus(calculatedGap, real);
    }

    onUpdateProject(updated);
  }, [project, onUpdateProject]);

  const realProgressNum = Number(project.realProgress) || 0;
  const schedProgressNum = Number(project.scheduledProgress) || 0;
  const calculatedGap = calculateGap(realProgressNum, schedProgressNum);
  const currentStatus = determineStatus(calculatedGap, realProgressNum);

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
      {/* Ficha del Proyecto Button (Far Left) */}
      <td className="p-1.5 border-r border-slate-200 text-center w-[40px]">
        {onOpenProjectDetail && (
          <button
            type="button"
            onClick={() => onOpenProjectDetail(project)}
            className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-200/70 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center group-hover:text-navy shadow-2xs"
            title="Abrir Ficha del Proyecto (Datos generales y financieros)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </td>

      {/* XM Cell */}
      <td className="p-1.5 border-r border-slate-200">
        <XmCell
          value={project.xm}
          onChange={(val) => handleFieldUpdate("xm", val)}
        />
      </td>

      {/* Proyecto Name + Connection State Cycle Button */}
      <td className="p-1.5 border-r border-slate-200">
        <div className="flex items-center gap-1.5">
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

      {/* FPO Date */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableDateCell
          value={project.fpo}
          onChange={(val) => handleFieldUpdate("fpo", val)}
        />
      </td>

      {/* COD Date */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableDateCell
          value={project.cod}
          onChange={(val) => handleFieldUpdate("cod", val)}
        />
      </td>

      {/* Ven. CREG Date */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableDateCell
          value={project.creg}
          onChange={(val) => handleFieldUpdate("creg", val)}
        />
      </td>

      {/* % Avance Real */}
      <td className="p-1.5 border-r border-slate-200 text-right">
        <EditableNumberCell
          value={project.realProgress}
          onChange={(val) => handleFieldUpdate("realProgress", val)}
          min={0}
          max={100}
          className="w-16 font-bold text-slate-900"
          align="right"
        />
      </td>

      {/* Avance Programado */}
      <td className="p-1.5 border-r border-slate-200 text-right">
        <EditableNumberCell
          value={project.scheduledProgress}
          onChange={(val) => handleFieldUpdate("scheduledProgress", val)}
          min={0}
          max={100}
          className="w-16 text-slate-700"
          align="right"
        />
      </td>

      {/* GAP — auto calculated */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <GapBadge gap={calculatedGap} previousGap={project.previousGap} />
      </td>

      {/* GAP Anterior — centered & compact */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <EditableNumberCell
          value={project.previousGap}
          onChange={(val) => handleFieldUpdate("previousGap", val)}
          placeholder="0.0"
          className="w-16 text-slate-600"
          align="center"
        />
      </td>

      {/* Estado — auto calculated */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <StatusBadge status={currentStatus} />
      </td>

      {/* Action: Copy Single Report & Delete */}
      <td className="p-1.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={handleCopySingleReport}
            className={`p-1 rounded transition-all cursor-pointer ${
              copiedSingle
                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                : "text-slate-400 hover:text-navy hover:bg-slate-200/70"
            }`}
            title={`Copiar informe de avance de ${project.name || "este proyecto"} para WhatsApp/Teams`}
          >
            {copiedSingle ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
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
