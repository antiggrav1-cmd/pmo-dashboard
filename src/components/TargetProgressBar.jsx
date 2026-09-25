import React, { memo } from "react";

/**
 * Target Pin Progress Bar
 * Premium single-track progress bar with a floating Target Pin for scheduled milestone.
 */
export const TargetProgressBar = memo(function TargetProgressBar({
  real = 0,
  scheduled = 0,
  height = "h-3",
  showPin = true,
  showLabels = false,
  className = ""
}) {
  const realNum = Math.max(0, Math.min(100, Number(real) || 0));
  const schedNum = Math.max(0, Math.min(100, Number(scheduled) || 0));
  const gap = Number((realNum - schedNum).toFixed(1));
  const isAhead = gap >= 0;
  const isCriticalLag = gap < -10;

  // Determine bar fill styling based on health (Harmonious executive palette)
  const getFillGradient = () => {
    if (realNum >= 100) return "bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500";
    if (isAhead) return "bg-gradient-to-r from-navy via-navy-light to-nashville";
    if (isCriticalLag) return "bg-gradient-to-r from-navy via-slate-700 to-slate-500";
    return "bg-gradient-to-r from-navy via-slate-800 to-nashville/80";
  };

  // Calculate gap zone (shaded area between real and scheduled)
  const gapLeft = Math.min(realNum, schedNum);
  const gapWidth = Math.abs(realNum - schedNum);

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Optional Top Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1 px-0.5">
          <span className="flex items-center gap-1 text-navy font-bold">
            <span className="w-2 h-2 rounded-xs bg-navy inline-block"></span>
            Real: <strong className="text-slate-800">{realNum}%</strong>
          </span>
          <span className="flex items-center gap-1 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-slate-400 inline-block"></span>
            Meta: <strong className="text-slate-700">{schedNum}%</strong>
            <span className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${
              isAhead ? "bg-sky-50 text-sky-800 border border-sky-200/60" : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}>
              {gap > 0 ? `+${gap}%` : `${gap}%`}
            </span>
          </span>
        </div>
      )}

      {/* Progress Track Container */}
      <div className={`relative w-full ${height} bg-slate-100/90 rounded-full border border-slate-200/70 overflow-hidden flex items-center`}>
        {/* Shaded Gap Zone (Soft subtle tint, non-aggressive) */}
        {gapWidth > 0 && (
          <div
            className={`absolute top-0 bottom-0 transition-all duration-300 ${
              isAhead ? "bg-sky-100/60" : "bg-slate-200/60"
            }`}
            style={{
              left: `${gapLeft}%`,
              width: `${Math.min(gapWidth, 100 - gapLeft)}%`
            }}
          />
        )}

        {/* Real Progress Fill Bar */}
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-xs relative z-10 ${getFillGradient()}`}
          style={{ width: `${realNum}%` }}
        >
          {/* Subtle glossy highlight */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-full pointer-events-none" />
        </div>

        {/* Target Pin (Marcador Simple / Línea Discreta) */}
        {showPin && (
          <div
            className="absolute top-0 bottom-0 -translate-x-1/2 z-20 pointer-events-none transition-all duration-500 ease-out flex items-center justify-center"
            style={{ left: `${schedNum}%` }}
            title={`Meta Programada: ${schedNum}%`}
          >
            {/* Clean, flush target line marker with crisp border */}
            <div className="w-[2.5px] h-full bg-slate-900 rounded-full shadow-xs ring-1 ring-white/90" />
          </div>
        )}
      </div>
    </div>
  );
});
