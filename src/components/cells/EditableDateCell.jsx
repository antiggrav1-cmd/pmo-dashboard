import React, { memo, useState, useRef } from "react";
import { toInputDateFormat } from "../../utils/calculations";

export const EditableDateCell = memo(function EditableDateCell({
  value = "",
  onChange
}) {
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef(null);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setIsSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaved(false), 800);
    onChange(newVal);
  };

  return (
    <input
      type="date"
      value={toInputDateFormat(value)}
      onChange={handleChange}
      className={`w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border rounded text-xs text-slate-700 text-center focus:outline-none cursor-pointer transition-all duration-300 ${
        isSaved
          ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-400/50 text-emerald-950 font-bold scale-[1.02]"
          : "border-transparent hover:border-slate-300 focus:border-nashville focus:ring-2 focus:ring-nashville/20"
      }`}
    />
  );
});
