import React, { memo } from "react";
import { EQUIPMENT_STATUS_OPTIONS } from "../../utils/equipmentConstants";
import { getEquipmentStatusStyle } from "../../services/equipmentService";
import { toInputDateFormat } from "../../utils/calculations";

export const EquipmentCell = memo(function EquipmentCell({
  equipment = {},
  defaultBrand = "",
  onChange
}) {
  const status = equipment.status || "Fabricación";
  const eta = equipment.eta || "";
  const brand = equipment.brand || "";

  return (
    <div className="space-y-1.5 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 hover:bg-white hover:border-nashville transition-all shadow-2xs">
      {/* Status Selector */}
      <select
        value={status}
        onChange={(e) => onChange("status", e.target.value)}
        className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer w-full truncate shadow-2xs ${getEquipmentStatusStyle(status)}`}
      >
        {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.label}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* ETA Date Input */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">ETA:</span>
        <input
          type="date"
          value={toInputDateFormat(eta)}
          onChange={(e) => onChange("eta", e.target.value)}
          className="w-full text-[11px] text-slate-700 text-right bg-transparent focus:outline-none cursor-pointer"
        />
      </div>

      {/* Brand / Model Input */}
      <input
        type="text"
        placeholder={`Marca/Modelo (${defaultBrand.split("/")[0]?.trim() || "Genérico"})...`}
        value={brand}
        onChange={(e) => onChange("brand", e.target.value)}
        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-nashville truncate"
      />
    </div>
  );
});
