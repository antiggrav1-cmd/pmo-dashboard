import React, { memo, useCallback } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  MessageSquareText 
} from "lucide-react";
import { EQUIPMENT_TYPES } from "../utils/equipmentConstants";
import { EquipmentCell } from "./cells/EquipmentCell";
import { formatDate } from "../utils/calculations";
import { getEquipmentStatusStyle } from "../services/equipmentService";

export const EquipmentRow = memo(function EquipmentRow({
  project,
  isEven = false,
  isExpanded = false,
  onToggleExpand,
  onUpdateProject
}) {
  const handleEquipmentFieldChange = useCallback((equipmentId, field, value) => {
    const currentEquipment = project.equipment || {};
    const targetEq = currentEquipment[equipmentId] || {
      status: "Fabricación",
      edt: "",
      eta: "",
      brand: "",
      notes: ""
    };

    const updatedEquipment = {
      ...currentEquipment,
      [equipmentId]: {
        ...targetEq,
        [field]: value
      }
    };

    onUpdateProject({
      ...project,
      equipment: updatedEquipment
    });
  }, [project, onUpdateProject]);

  const eqData = project.equipment || {};

  return (
    <tr 
      className={`transition-colors ${
        isExpanded 
          ? "bg-sky-50/40 ring-inset ring-1 ring-navy/10" 
          : isEven 
            ? "bg-white hover:bg-slate-50" 
            : "bg-slate-50/50 hover:bg-slate-100/70"
      }`}
    >
      {/* Project Name + Expand/Collapse Trigger */}
      <td 
        className="p-2.5 px-3 border-r border-slate-200 font-bold text-navy select-none cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className={`p-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
              isExpanded 
                ? "bg-navy text-white border-navy shadow-2xs" 
                : "bg-white text-slate-400 border-slate-200 hover:text-navy hover:bg-slate-100"
            }`}
            title={isExpanded ? "Plegar fila de proyecto" : "Desplegar fila de proyecto"}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>

          <div className="min-w-0">
            <div className="truncate max-w-[155px] text-xs font-bold text-navy" title={project.name}>
              {project.name}
            </div>
            <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
              <span>FPO: {project.fpo ? formatDate(project.fpo) : "Por definir"}</span>
              {isExpanded && (
                <span className="text-[9px] font-black uppercase text-navy bg-lemony px-1.5 py-0.2 rounded shadow-2xs">
                  Abierto
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 5 Equipment Columns */}
      {EQUIPMENT_TYPES.map((eqType) => {
        const item = eqData[eqType.id] || {};
        const status = item.status || "Fabricación";
        const edt = item.edt || item.etd || "";
        const eta = item.eta || "";
        const notes = item.notes || "";
        const isDelayed = status.toLowerCase().includes("retrasad");
        const isNoPedido = status.toLowerCase().includes("no pedido") || status.toLowerCase().includes("pendiente oc");

        return (
          <td key={eqType.id} className="p-2 border-r border-slate-200 align-top">
            {isExpanded ? (
              /* Expanded State: Full Editable Equipment Cell */
              <EquipmentCell
                equipment={item}
                onChange={(field, value) => handleEquipmentFieldChange(eqType.id, field, value)}
              />
            ) : (
              /* Collapsed State: Sleek Compact Pill to Save Space */
              <div
                onClick={onToggleExpand}
                className="flex items-center justify-between gap-1.5 p-1 px-2 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-white hover:border-navy hover:shadow-2xs transition-all cursor-pointer group select-none min-h-[34px]"
                title={`Clic para desplegar y editar. Estado: ${status}${eta ? ` | ETA: ${formatDate(eta)}` : ""}${notes ? ` | Nota: "${notes}"` : ""}`}
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg border truncate ${getEquipmentStatusStyle(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                  {(isDelayed || isNoPedido) && (
                    <span className="text-[11px]" title="Equipo con alerta o retraso">
                      ⚠️
                    </span>
                  )}
                  {notes && (
                    <span 
                      className="p-0.5 rounded text-amber-700 bg-amber-100 border border-amber-300" 
                      title={`Observación: "${notes}"`}
                    >
                      <MessageSquareText className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {(eta || edt) && (
                    <span 
                      className="text-[9.5px] font-semibold text-slate-500 hidden xl:inline"
                      title={eta ? `ETA: ${formatDate(eta)}` : `EDT: ${formatDate(edt)}`}
                    >
                      {eta ? formatDate(eta) : formatDate(edt)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
});
