/**
 * Styling mappings for Restriction Categories.
 * Extracted from CommentsView to a standalone constants file so
 * components can import without circular / fast-refresh issues.
 */
export const RESTRICTION_STYLES = {
  Suministro:  "bg-rose-100 text-rose-800 border-rose-200",
  Diseño:      "bg-orange-100 text-orange-800 border-orange-200",
  Logística:   "bg-amber-100 text-amber-900 border-amber-300",
  Calidad:     "bg-emerald-100 text-emerald-800 border-emerald-200",
  "OR/CREG":   "bg-sky-200 text-sky-900 border-sky-300",
  Contratista: "bg-teal-100 text-teal-900 border-teal-200",
  SST:         "bg-purple-100 text-purple-800 border-purple-200",
  Financiera:  "bg-purple-900 text-white font-bold",
  Montaje:     "bg-emerald-800 text-white font-bold",
  DD:          "bg-slate-200 text-slate-800 border-slate-300",
  General:     "bg-slate-100 text-slate-700 border-slate-300",
};

/**
 * Styling mappings for Restriction Statuses.
 */
export const STATUS_STYLES = {
  "Activa":      "bg-emerald-600 text-white font-bold",
  "Completada":  "bg-slate-500 text-white font-bold",
  "En curso":    "bg-emerald-600 text-white font-bold",
  "En revisión": "bg-amber-500 text-white font-bold",
  "Pendiente":   "bg-rose-600 text-white font-bold",
  "Resuelto":    "bg-slate-500 text-white font-bold",
};
