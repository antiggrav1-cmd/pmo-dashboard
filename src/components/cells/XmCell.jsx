import React, { useState, memo } from "react";
import { Link2, ExternalLink, Copy, Check } from "lucide-react";

export const XmCell = memo(function XmCell({ value = "", onChange }) {
  const [copied, setCopied] = useState(false);

  const isLink = Boolean(
    value && (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.includes("drive.google") ||
      value.includes("sharepoint") ||
      value.includes(".com") ||
      value.includes(".co") ||
      value.includes(".pdf")
    )
  );

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAttachPrompt = () => {
    const entered = window.prompt("Pega aquí el enlace o nombre de archivo para XM:", value);
    if (entered !== null) {
      onChange(entered.trim());
    }
  };

  return (
    <div className="flex items-center gap-1 bg-white hover:bg-slate-50 focus-within:bg-white border border-slate-200 focus-within:border-nashville focus-within:ring-2 focus-within:ring-nashville/20 rounded-lg px-1.5 py-0.5 transition-all">
      <input
        type="text"
        placeholder="Pegar enlace / archivo..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-0.5 truncate font-medium"
        title={value || "Escribe o pega el enlace de XM"}
      />

      {/* Attach / Edit Dialog button */}
      <button
        type="button"
        onClick={handleAttachPrompt}
        title="Adjuntar o editar enlace"
        className="p-1 text-slate-400 hover:text-navy hover:bg-slate-200/60 rounded transition-colors shrink-0 cursor-pointer"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>

      {/* External Link button (if valid link) */}
      {isLink && (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          title="Abrir enlace en pestaña nueva"
          className="p-1 text-navy hover:text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      {/* Copy Link button */}
      {value && (
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? "¡Copiado!" : "Copiar enlace"}
          className={`p-1 rounded transition-colors shrink-0 cursor-pointer ${
            copied ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
});
