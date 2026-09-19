import React, { useState, useEffect, memo } from "react";
import { formatCurrencyCop, formatCurrencyUsd } from "../../utils/calculations";

export const CurrencyInputCell = memo(function CurrencyInputCell({
  value = 0,
  currency = "COP",
  onChange,
  className = ""
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState(value !== undefined && value !== null && value !== 0 ? String(value) : "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value !== undefined && value !== null && value !== 0 ? String(value) : "");
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const cleaned = localVal.replace(/[^0-9.-]+/g, "");
    const parsed = cleaned === "" ? 0 : Number(cleaned) || 0;
    if (parsed !== value) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 800);
      onChange(parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  const formattedDisplay = currency === "COP"
    ? formatCurrencyCop(Number(value) || 0)
    : formatCurrencyUsd(Number(value) || 0);

  return (
    <div className={"relative flex items-center justify-end w-full " + className}>
      {isFocused ? (
        <div className="flex items-center w-full bg-white border border-nashville ring-2 ring-nashville/20 rounded-lg px-2 py-1 shadow-2xs">
          <span className={"font-bold mr-1 text-xs select-none " + (currency === "USD" ? "text-blue-600" : "text-slate-400")}>
            $
          </span>
          <input
            type="number"
            autoFocus
            step="1"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className={"w-full bg-transparent text-xs font-bold text-right focus:outline-none tabular-nums " + (currency === "USD" ? "text-blue-900" : "text-slate-900")}
          />
        </div>
      ) : (
        <div
          onClick={() => setIsFocused(true)}
          title="Clic para editar valor"
          className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold text-right cursor-pointer border transition-all duration-300 tabular-nums select-none ${
            isSaved
              ? "bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400/40 font-black scale-[1.02]"
              : "hover:bg-white hover:border hover:border-slate-300 border-transparent " +
                (currency === "USD" ? (Number(value) > 0 ? "text-blue-900 font-extrabold" : "text-slate-400") : (Number(value) > 0 ? "text-slate-900 font-extrabold" : "text-slate-400"))
          }`}
        >
          {Number(value) > 0 ? formattedDisplay : "$ 0"}
        </div>
      )}
    </div>
  );
});