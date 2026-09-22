import React, { memo } from "react";
import { Check } from "lucide-react";
import { CONNECTION_STATES } from "../models/projectModel";

const STEP_INFO = {
  "DD":         { label: "Due Diligence",  shortLabel: "DD",      emoji: "📋", desc: "Viabilidad y trámites" },
  "Ingeniería": { label: "Ingeniería",     shortLabel: "Ing.",     emoji: "📐", desc: "Diseños y planos" },
  "Montaje":    { label: "Montaje",        shortLabel: "Montaje",  emoji: "🔧", desc: "Construcción y obras" },
  "Energizado": { label: "Energizado",     shortLabel: "Energiz.", emoji: "⚡", desc: "Conexión a red" },
  "Entregado":  { label: "Entregado",      shortLabel: "Entreg.",  emoji: "✅", desc: "Operación final" }
};

export const ConnectionFlowStepper = memo(function ConnectionFlowStepper({
  currentState = "Ingeniería",
  onChangeState,
  interactive = true,
  compact = false,
  className = ""
}) {
  const currentIndex = CONNECTION_STATES.indexOf(currentState);
  const activeIdx = currentIndex >= 0 ? currentIndex : 1;

  return (
    <div className={`w-full select-none ${className}`}>
      <div className="flex items-center justify-between relative w-full">
        {CONNECTION_STATES.map((state, idx) => {
          const info = STEP_INFO[state] || { label: state, shortLabel: state, emoji: "•", desc: "" };
          const isCompleted = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const _isPending = idx > activeIdx;
          const isClickable = interactive && typeof onChangeState === "function";

          return (
            <React.Fragment key={state}>
              {/* Step Node */}
              <div className="flex flex-col items-center relative z-10">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onChangeState(state)}
                  className={`group relative flex items-center justify-center rounded-2xl transition-all duration-300 ${
                    compact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
                  } ${
                    isCurrent
                      ? "bg-navy text-lemony ring-4 ring-navy/20 shadow-lg scale-110 font-black"
                      : isCompleted
                      ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                      : "bg-white text-slate-400 border-2 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                  } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                  title={`${info.label} (${idx + 1}/5) — ${info.desc}`}
                >
                  {/* Glowing beacon ring on active */}
                  {isCurrent && (
                    <span className="absolute -inset-1 rounded-2xl bg-lemony/30 animate-pulse pointer-events-none" />
                  )}

                  {isCompleted ? (
                    <Check className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={3} />
                  ) : (
                    <span>{info.emoji}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="text-center mt-1.5 min-w-[50px]">
                  <span
                    className={`block text-[10px] font-black uppercase tracking-wider transition-colors ${
                      isCurrent
                        ? "text-navy"
                        : isCompleted
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }`}
                  >
                    {compact ? info.shortLabel : info.label}
                  </span>
                  {!compact && (
                    <span className="text-[9px] text-slate-400 font-medium hidden sm:block">
                      {isCompleted ? "Completado" : isCurrent ? "En curso" : "Pendiente"}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting Line between nodes */}
              {idx < CONNECTION_STATES.length - 1 && (
                <div className="flex-1 h-1 mx-1.5 relative -top-3.5 rounded-full overflow-hidden bg-slate-200">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      idx < activeIdx
                        ? "bg-emerald-500 w-full"
                        : idx === activeIdx
                        ? "bg-gradient-to-r from-navy to-slate-200 w-full"
                        : "bg-transparent w-0"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});
