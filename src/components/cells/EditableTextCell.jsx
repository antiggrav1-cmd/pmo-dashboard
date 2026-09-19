import React, { memo, useState, useRef } from "react";

export const EditableTextCell = memo(function EditableTextCell({
  value = "",
  onChange,
  placeholder = "Escribir...",
  className = ""
}) {
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef(null);

  const triggerFeedback = () => {
    setIsSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaved(false), 800);
  };

  const handleChange = (e) => {
    triggerFeedback();
    onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value || ""}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border rounded text-xs text-slate-800 focus:outline-none transition-all duration-300 ${className} ${
        isSaved
          ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-400/50 text-emerald-950 font-bold scale-[1.01]"
          : "border-transparent hover:border-slate-300 focus:border-nashville focus:ring-2 focus:ring-nashville/20"
      }`}
    />
  );
});
