import React, { memo } from "react";
import { 
  Plus, 
  Download, 
  Upload, 
  FileText,
  LayoutDashboard,
  Cloud,
  RefreshCw
} from "lucide-react";

export const Navbar = memo(function Navbar({
  onOpenCreateProject,
  onOpenImportModal,
  onExportExcel,
  onOpenExecutiveReport,
  currentPortfolioName = "Portafolio",
  currentPortfolioAtc = "",
  isGlobalView = false,
  syncStatus = "local"
}) {
  return (
    <header className="glass-nav px-6 py-3.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 transition-all">
      {/* Title / Current Portfolio */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-nashville/60 text-navy bg-nashville/15 shadow-2xs inline-flex items-center gap-1.5">
              {isGlobalView
                ? <LayoutDashboard className="w-3 h-3" />
                : <span className="w-1.5 h-1.5 rounded-full bg-lemony animate-pulse"></span>
              }
              <span>{isGlobalView ? "Dashboard Global" : "Portafolio Activo"}</span>
            </span>

            {!isGlobalView && currentPortfolioAtc && currentPortfolioAtc !== "Sin Asignar" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy border border-navy/20 flex items-center gap-1">
                <span>ATC: {currentPortfolioAtc}</span>
              </span>
            )}

            {/* Supabase Live Status Badge */}
            {syncStatus === "connected" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs" title="Conectado a Supabase en tiempo real. Múltiples analistas pueden editar simultáneamente.">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden md:inline">En Vivo Multi-usuario</span>
              </span>
            )}
            {syncStatus === "connecting" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Conectando nube...</span>
              </span>
            )}
            {syncStatus === "local" && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1" title="Modo Almacenamiento Local (Configura Supabase para edición multi-usuario en vivo)">
                <Cloud className="w-2.5 h-2.5 text-slate-400" />
                <span className="hidden md:inline">Modo Local</span>
              </span>
            )}
            {syncStatus === "offline" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1" title="Desconectado de Supabase. Cambios guardados localmente.">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Desconectado</span>
              </span>
            )}
          </div>

          <h1 className="text-lg font-black text-slate-900 tracking-tight truncate max-w-[300px] md:max-w-xs mt-1">
            {currentPortfolioName}
          </h1>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Executive Report — single portfolio only */}
        {!isGlobalView && (
          <button
            onClick={onOpenExecutiveReport}
            type="button"
            title="Generar Informe Ejecutivo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-navy bg-gradient-to-r from-lemony/30 to-lemony/50 hover:from-lemony/50 hover:to-lemony/70 border border-lemony transition-all cursor-pointer shadow-2xs card-hover"
          >
            <FileText className="w-3.5 h-3.5 text-navy" />
            <span>Informe Ejecutivo</span>
          </button>
        )}

        {/* Import Excel — portfolio view only */}
        {!isGlobalView && (
          <button
            onClick={onOpenImportModal}
            type="button"
            title="Importar Excel"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-2xs card-hover"
          >
            <Upload className="w-3.5 h-3.5 text-navy" />
            <span className="hidden sm:inline">Importar</span>
          </button>
        )}

        {/* Export Excel — portfolio view only; global export lives in AnderDashboard header */}
        {!isGlobalView && (
          <button
            onClick={onExportExcel}
            type="button"
            title="Exportar Excel"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-navy bg-nashville/15 hover:bg-nashville/30 border border-nashville/60 transition-all cursor-pointer shadow-2xs card-hover"
          >
            <Download className="w-3.5 h-3.5 text-navy" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        )}

        {/* New Project — portfolio view only */}
        {!isGlobalView && (
          <button
            onClick={onOpenCreateProject}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark shadow-md transition-all cursor-pointer card-hover"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Proyecto</span>
          </button>
        )}
      </div>
    </header>
  );
});
