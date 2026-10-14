import React, { memo, useState, useRef, useEffect } from "react";
import { MessageSquareText, X } from "lucide-react";

const MilestoneCommentDialog = memo(function MilestoneCommentDialog({
  notes = "",
  milestoneName = "",
  onSave,
  onClose
}) {
  const [tempNotes, setTempNotes] = useState(notes || "");
  const dialogRef = useRef(null);

  // Click outside and Escape key to close popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSave = () => {
    onSave?.(tempNotes.trim());
    onClose?.();
  };

  const handleClear = () => {
    setTempNotes("");
    onSave?.("");
    onClose?.();
  };

  return (
    <div
      ref={dialogRef}
      className="absolute z-50 right-0 top-full mt-1.5 w-72 sm:w-80 p-3 bg-white rounded-2xl shadow-xl border border-slate-200 space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageSquareText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-navy block leading-none">Observación del Hito</span>
            {milestoneName && (
              <span className="text-[10px] text-slate-400 font-medium truncate block max-w-[200px] mt-0.5" title={milestoneName}>
                {milestoneName}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors shrink-0"
          title="Cerrar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        rows={3}
        placeholder="Escribe una observación o comentario..."
        value={tempNotes}
        onChange={(e) => setTempNotes(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
        autoFocus
        className="w-full text-xs text-slate-700 placeholder:text-slate-400 p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-nashville focus:bg-white focus:outline-none transition-all resize-none shadow-inner leading-relaxed"
      />

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-0.5">
        {notes ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
          >
            Borrar
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">Shift+Enter para salto</span>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 bg-navy hover:bg-navy-dark text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          Guardar
        </button>
      </div>
    </div>
  );
});

export const MilestoneCommentPopover = memo(function MilestoneCommentPopover({
  isOpen = false,
  onToggle,
  onClose,
  notes = "",
  milestoneName = "",
  onSave
}) {
  return (
    <div className="relative shrink-0">
      {/* Icon Button */}
      <button
        type="button"
        onClick={onToggle}
        title={notes ? `Observación: "${notes}" (Clic para editar)` : "Añadir observación"}
        className={`relative p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
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

      {/* Floating Micro-Popover Window */}
      {isOpen && (
        <MilestoneCommentDialog
          notes={notes}
          milestoneName={milestoneName}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </div>
  );
});
