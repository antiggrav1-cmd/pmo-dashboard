import React, { memo, useState, useMemo } from "react";
import { 
  FolderInput, 
  X, 
  ArrowRight, 
  Check, 
  FolderKanban, 
  Building2, 
  User, 
  AlertCircle,
  Briefcase
} from "lucide-react";

export const MoveProjectModal = memo(function MoveProjectModal({
  isOpen,
  project,
  currentPortfolioId,
  currentPortfolioName = "",
  portfolios = [],
  onMoveProject,
  onSelectPortfolio,
  onClose
}) {
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [navigateToTarget, setNavigateToTarget] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Filter out the portfolio the project currently belongs to
  const availablePortfolios = useMemo(() => {
    if (!project) return [];
    // If project has portfolioId or we use currentPortfolioId
    const sourceId = project.portfolioId || currentPortfolioId;
    return (portfolios || []).filter((p) => p.id !== sourceId);
  }, [portfolios, project, currentPortfolioId]);

  // Reset state when opening with a project
  const [prevProject, setPrevProject] = useState(project);
  if (project !== prevProject) {
    setPrevProject(project);
    setSelectedTargetId(availablePortfolios[0]?.id || "");
    setSuccessMessage("");
    setIsSubmitting(false);
  }

  if (!isOpen || !project) return null;

  const currentPort = (portfolios || []).find((p) => p.id === (project.portfolioId || currentPortfolioId));
  const effectiveCurrentName = currentPortfolioName || currentPort?.name || "Portafolio Actual";

  const targetPort = availablePortfolios.find((p) => p.id === selectedTargetId);

  const handleConfirmMove = () => {
    if (!selectedTargetId) return;

    setIsSubmitting(true);
    const sourceId = project.portfolioId || (String(project.id).includes("::") ? project.id.split("::")[0] : currentPortfolioId);
    const cleanId = String(project.id).includes("::") ? project.id.split("::")[1] : project.id;

    const moved = onMoveProject(cleanId, selectedTargetId, sourceId, project);

    if (moved !== false) {
      setSuccessMessage(`Proyecto movido exitosamente a "${targetPort?.name || 'nuevo portafolio'}"`);
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage("");
        onClose();
        if (navigateToTarget && onSelectPortfolio) {
          onSelectPortfolio(selectedTargetId);
        }
      }, 700);
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 transform transition-all scale-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-navy text-lemony shadow-xs">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy leading-tight">
                Mover Proyecto de Portafolio
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Reasignar pertenencia y transferir datos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Being Moved Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Proyecto Seleccionado
            </span>
            {project.xm && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                XM: {project.xm}
              </span>
            )}
          </div>
          <p className="text-sm font-black text-navy">{project.name || "Sin nombre"}</p>
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 font-medium">Portafolio origen:</span>
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-amber-700" />
              {effectiveCurrentName}
            </span>
          </div>
        </div>

        {/* Target Portfolio Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            Seleccionar Portafolio Destino
          </label>

          {availablePortfolios.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
              No hay otros portafolios disponibles en el sistema para reasignar este proyecto.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {availablePortfolios.map((port) => {
                const isSelected = selectedTargetId === port.id;
                const projCount = (port.projects || []).length;

                return (
                  <button
                    key={port.id}
                    type="button"
                    onClick={() => setSelectedTargetId(port.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-navy/5 border-navy ring-2 ring-navy/20 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-navy bg-navy text-lemony"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">{port.name}</p>
                          {port.code && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              ({port.code})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {port.atc || "Sin ATC"}
                          </span>
                          <span>•</span>
                          <span>{projCount} {projCount === 1 ? "proyecto" : "proyectos"}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 ${isSelected ? "text-navy" : "text-slate-300"}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Options & Notice */}
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={navigateToTarget}
              onChange={(e) => setNavigateToTarget(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy/30 cursor-pointer"
            />
            <span>Cambiar automáticamente a la vista del portafolio destino</span>
          </label>

          <p className="text-[11px] text-slate-500 flex items-start gap-1.5 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Todos los hitos de pago, restricciones, estado de equipos y presupuesto se transferirán intactos al nuevo portafolio.
            </span>
          </p>
        </div>

        {/* Success Feedback */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={!selectedTargetId || isSubmitting || availablePortfolios.length === 0}
            className="px-4 py-2 text-xs font-bold text-navy bg-lemony hover:bg-lemony-dark shadow-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-black"
          >
            <FolderInput className="w-4 h-4 text-navy" />
            <span>{isSubmitting ? "Moviendo..." : "Mover Proyecto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
});
