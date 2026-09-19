import React, { memo, useCallback } from "react";
import { EQUIPMENT_TYPES } from "../utils/equipmentConstants";
import { EquipmentCell } from "./cells/EquipmentCell";
import { formatDate } from "../utils/calculations";

export const EquipmentRow = memo(function EquipmentRow({
  project,
  isEven = false,
  onUpdateProject
}) {
  const handleEquipmentFieldChange = useCallback((equipmentId, field, value) => {
    const currentEquipment = project.equipment || {};
    const targetEq = currentEquipment[equipmentId] || {
      status: "Fabricación",
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
    <tr className={`hover:bg-slate-50 transition-colors ${isEven ? "bg-white" : "bg-slate-50/50"}`}>
      {/* Project Name */}
      <td className="p-3 border-r border-slate-200 font-bold text-navy">
        <div className="truncate max-w-[160px]" title={project.name}>
          {project.name}
        </div>
        <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
          FPO: {project.fpo ? formatDate(project.fpo) : "Por definir"}
        </span>
      </td>

      {/* 5 Equipment Columns */}
      {EQUIPMENT_TYPES.map((eqType) => (
        <td key={eqType.id} className="p-2 border-r border-slate-200 align-top">
          <EquipmentCell
            equipment={eqData[eqType.id]}
            defaultBrand={eqType.defaultBrand}
            onChange={(field, value) => handleEquipmentFieldChange(eqType.id, field, value)}
          />
        </td>
      ))}
    </tr>
  );
});
