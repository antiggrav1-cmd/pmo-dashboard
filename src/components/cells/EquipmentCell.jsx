import React, { memo, useState, useRef, useEffect } from "react";
import { MessageSquareText, X } from "lucide-react";
import { EQUIPMENT_STATUS_OPTIONS } from "../../utils/equipmentConstants";
import { getEquipmentStatusStyle } from "../../services/equipmentService";
import { toInputDateFormat } from "../../utils/calculations";

export const EquipmentCell = memo(function EquipmentCell({
  equipment = {},
  onChange
}) {
  const status = equipment.status || "Fabricación";
  const edt = equipment.edt || equipment.etd || "";
  const eta = equipment.eta || "";
  const notes = equipment.notes || "";

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState("");
  const popoverRef = useRef(null);

  const handleOpenPopover = () => {
    setTempNotes(notes || "");
    setIsPopoverOpen((prev) => !prev);
  };

  // Click outside to close popover
  useEffect(() => {
    if (!isPopoverOpen) return;

    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsPopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen]);

  const handleSaveNote = () => {
    onChange("notes", tempNotes.trim());
    setIsPopoverOpen(false);
  };

  const handleClearNote = () => {
    setTempNotes("");
    onChange("notes", "");
    setIsPopoverOpen(false);
  };

  return (
    <div className="space-y-1.5 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 hover:bg-white hover:border-nashville transition-all shadow-2xs">
      {/* Top Row: Status Selector + Note Popover Button */}
      <div className="flex items-center gap-1.5">
        <select
          value={status}
          onChange={(e) => onChange("status", e.target.value)}
          className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer flex-1 min-w-0 truncate shadow-2xs ${getEquipmentStatusStyle(status)}`}
        >
          {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Note Icon Button & Popover */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={handleOpenPopover}
            title={notes ? `Observación: "${notes}" (Clic para editar)` : "Añadir observación"}
            className={`relative p-1 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
              notes
                ? "bg-amber-100 border-amber-300 text-amber-800 shadow-2xs hover:bg-amber-200"
                : "bg-white border-slate-200 text-slate-400 hover:text-navy hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            {notes && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" />
            )}
          </button>

          {/* Floating Micro-Popover */}
          {isPopoverOpen && (
            <div
              ref={popoverRef}
              className="absolute z-50 right-0 top-full mt-1.5 w-60 p-3 bg-white rounded-2xl shadow-xl border border-slate-200 space-y-2"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                  <MessageSquareText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Observación</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <textarea
                rows={2}
                placeholder="Escribe una observación..."
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveNote();
                  }
                }}
                autoFocus
                className="w-full text-xs text-slate-700 placeholder:text-slate-400 p-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-nashville focus:bg-white focus:outline-none transition-all resize-none"
              />

              <div className="flex items-center justify-between pt-0.5">
                {notes ? (
                  <button
                    type="button"
                    onClick={handleClearNote}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Borrar
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-2.5 py-1 bg-navy hover:bg-navy-dark text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDT Date Input */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5" title="Fecha Estimada de Salida / Despacho (EDT)">
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">EDT:</span>
        <input
          type="date"
          value={toInputDateFormat(edt)}
          onChange={(e) => onChange("edt", e.target.value)}
          className="w-full text-[11px] text-slate-700 text-right bg-transparent focus:outline-none cursor-pointer"
        />
      </div>

      {/* ETA Date Input */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5" title="Fecha Estimada de Llegada a Sitio (ETA)">
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">ETA:</span>
        <input
          type="date"
          value={toInputDateFormat(eta)}
          onChange={(e) => onChange("eta", e.target.value)}
          className="w-full text-[11px] text-slate-700 text-right bg-transparent focus:outline-none cursor-pointer"
        />
      </div>
    </div>
  );
});
