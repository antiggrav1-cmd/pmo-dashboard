export const EQUIPMENT_TYPES = [
  {
    id: "paneles",
    name: "Paneles",
    fullName: "Módulos Fotovoltaicos",
    icon: "Sun",
    defaultBrand: "Trina / Jinko",
  },
  {
    id: "trackers",
    name: "Tracker",
    fullName: "Seguidores / Estructuras",
    icon: "Sliders",
    defaultBrand: "Nextracker / Soltec",
  },
  {
    id: "shelter",
    name: "Shelter",
    fullName: "Caseta / Centro Transformación",
    icon: "Box",
    defaultBrand: "Schneider / Ingeteam",
  },
  {
    id: "inversores",
    name: "Inversores",
    fullName: "Inversores de Potencia",
    icon: "Cpu",
    defaultBrand: "Huawei / Sungrow",
  },
  {
    id: "reconectador",
    name: "Reconectador",
    fullName: "Reconectador / Celda MT",
    icon: "Zap",
    defaultBrand: "Noja Power / ABB",
  }
];

export const EQUIPMENT_STATUS_OPTIONS = [
  { label: "No pedido",           color: "bg-rose-50 text-rose-700 border-rose-200",      dot: "bg-rose-500" },
  { label: "Pendiente OC",        color: "bg-slate-50 text-slate-700 border-slate-200",   dot: "bg-slate-400" },
  { label: "Fabricación",         color: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  { label: "Buscando booking",    color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  { label: "Espera de UF",        color: "bg-amber-50 text-amber-800 border-amber-200",   dot: "bg-amber-500" },
  { label: "Espera de BT",        color: "bg-orange-50 text-orange-800 border-orange-200", dot: "bg-orange-500" },
  { label: "En tránsito",         color: "bg-cyan-50 text-cyan-800 border-cyan-200",      dot: "bg-cyan-500" },
  { label: "Tránsito marítimo",   color: "bg-cyan-50 text-cyan-800 border-cyan-200",      dot: "bg-cyan-500" },
  { label: "Tránsito terrestre",  color: "bg-amber-50 text-amber-800 border-amber-200",   dot: "bg-amber-500" },
  { label: "Nacionalización",     color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  { label: "En despacho",         color: "bg-orange-50 text-orange-700 border-orange-200",  dot: "bg-orange-500" },
  { label: "En sitio",            color: "bg-teal-50 text-teal-800 border-teal-200",      dot: "bg-teal-500" },
  { label: "Instalado",           color: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  { label: "Retrasado",           color: "bg-rose-50 text-rose-800 border-rose-200",      dot: "bg-rose-500" },
];

export function getDefaultEquipment() {
  return {
    paneles:      { status: "Fabricación", progress: 0, eta: "", brand: "", notes: "" },
    trackers:     { status: "Fabricación", progress: 0, eta: "", brand: "", notes: "" },
    shelter:      { status: "Fabricación", progress: 0, eta: "", brand: "", notes: "" },
    inversores:   { status: "Fabricación", progress: 0, eta: "", brand: "", notes: "" },
    reconectador: { status: "Fabricación", progress: 0, eta: "", brand: "", notes: "" },
  };
}
