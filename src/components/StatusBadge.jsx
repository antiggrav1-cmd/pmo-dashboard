import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function StatusBadge({ status }) {
  const s = (status || "En tiempo").trim().toLowerCase();

  let bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let dot = "bg-emerald-500";

  if (s.includes("atrasad") || s.includes("critico") || s.includes("crítico")) {
    bg = "bg-rose-50 text-rose-700 border-rose-200";
    dot = "bg-rose-500";
  } else if (s.includes("riesgo") || s.includes("rezago") || s.includes("alerta") || s.includes("observacion") || s.includes("observación")) {
    bg = "bg-amber-50 text-amber-700 border-amber-200";
    dot = "bg-amber-500";
  } else if (s.includes("adelantad")) {
    bg = "bg-blue-50 text-blue-700 border-blue-200";
    dot = "bg-blue-500";
  } else if (s.includes("completad") || s.includes("finalizad")) {
    bg = "bg-purple-50 text-purple-700 border-purple-200";
    dot = "bg-purple-500";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {status || "En tiempo"}
    </span>
  );
}

export function GapBadge({ gap, previousGap }) {
  const numGap = parseFloat(gap) || 0;
  const numPrev = parseFloat(previousGap);

  const isSevere = numGap < -15;
  const isModerate = numGap < -5 && numGap >= -15;

  let colorClass = "text-emerald-700 bg-emerald-50";
  if (isSevere) {
    colorClass = "text-rose-700 bg-rose-50 font-bold";
  } else if (isModerate) {
    colorClass = "text-amber-700 bg-amber-50";
  }

  // Trend comparison: GAP vs previousGap
  let TrendIcon = null;
  let trendColor = "text-slate-400";
  let trendTitle = "Sin variación respecto al corte anterior";

  if (!isNaN(numPrev)) {
    const diff = Number((numGap - numPrev).toFixed(2));
    if (diff > 0.1) {
      TrendIcon = TrendingUp;
      trendColor = "text-emerald-600";
      trendTitle = `Mejoró +${diff}% respecto al corte anterior (${numPrev}%)`;
    } else if (diff < -0.1) {
      TrendIcon = TrendingDown;
      trendColor = "text-rose-600";
      trendTitle = `Empeoró ${diff}% respecto al corte anterior (${numPrev}%)`;
    } else {
      TrendIcon = Minus;
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded text-xs font-medium tabular-nums ${colorClass}`}>
        {numGap > 0 ? `+${numGap}%` : `${numGap}%`}
      </span>
      {TrendIcon && (
        <span title={trendTitle} className={`inline-flex items-center cursor-help ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
}
