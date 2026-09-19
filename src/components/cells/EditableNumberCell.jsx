import React, { memo, useState, useRef } from "react";

export const EditableNumberCell = memo(function EditableNumberCell({
  value = 0,
  onChange,
  step = "any",
  min,
  max,
  suffix = "%",
  placeholder = "0",
  align = "right",
  className = "w-20"
}) {
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef(null);

  const triggerFeedback = () => {
    setIsSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaved(false), 800);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    triggerFeedback();
    if (raw === "") {
      onChange(0);
    } else {
      const parsed = parseFloat(raw);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const justifyClass = align === "center" ? "justify-center" : align === "left" ? "justify-start" : "justify-end";
  const textAlignClass = align === "center" ? "text-center pr-3" : align === "left" ? "text-left pr-4" : "text-right pr-4";

  return (
    <div className={`relative flex items-center ${justifyClass} w-full`}>
      <div className="relative inline-flex items-center">
        <input
          type="number"
          step={step}
          onWheel={(e) => e.currentTarget.blur()}
          min={min}
          max={max}
          placeholder={placeholder}
          value={value !== undefined && value !== null && value !== 0 ? value : ""}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`${className} px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border rounded text-xs text-slate-800 ${textAlignClass} focus:outline-none tabular-nums transition-all duration-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            isSaved
              ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-400/50 text-emerald-950 font-black scale-[1.03]"
              : "border-transparent hover:border-slate-300 focus:border-nashville focus:ring-2 focus:ring-nashville/20"
          }`}
        />
        {suffix && (
          <span className="text-[11px] text-slate-400 font-bold -ml-2.5 pointer-events-none pr-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
});
