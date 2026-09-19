import React, { memo, useMemo, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Wallet, SlidersHorizontal, Building2, User, Radio } from "lucide-react";
import { formatCurrencyCop, formatCurrencyUsd } from "../utils/calculations";
import { getPortfolioBudgetMetrics, getProjectBudgetMetrics } from "../utils/budgetCalculations";

const statusStyle = { 
  Saludable: "bg-emerald-100 text-emerald-800", 
  "En riesgo": "bg-amber-100 text-amber-800", 
  Sobrecosto: "bg-rose-100 text-rose-800", 
  "Sin ejecución": "bg-slate-100 text-slate-600", 
  "Falta TRM": "bg-rose-100 text-rose-800" 
};
const money = (value) => value === null || value === undefined ? "—" : formatCurrencyCop(value);

const BUDGET_COLUMNS = [
  { id: "name", label: "Proyecto", align: "text-left" },
  { id: "realProgress", label: "% Avance Real", align: "text-right" },
  { id: "capexVenta", label: "CAPEX (Venta)", align: "text-right" },
  { id: "bac", label: "Presup. (BAC)", align: "text-right" },
  { id: "ev", label: "Valor Ganado (EV)", align: "text-right" },
  { id: "ac", label: "Costo Real (AC)", align: "text-right" },
  { id: "cpi", label: "CPI", align: "text-right" },
  { id: "cv", label: "CV ($)", align: "text-right" },
  { id: "eac", label: "EAC (Proyectado)", align: "text-right" },
  { id: "margin", label: "Margen Proyectado", align: "text-right" },
  { id: "status", label: "Estado", align: "text-right" }
];

export const BudgetView = memo(function BudgetView({ 
  projects = [], 
  onUpdateProject,
  onOpenProjectDetail 
}) {
  const [selectedId, setSelectedId] = useState(() => projects[0]?.id || "");
  const selected = projects.find((project) => project.id === selectedId) || projects[0];
  const totals = useMemo(() => getPortfolioBudgetMetrics(projects), [projects]);

  const update = (project, field, raw) => {
    const nextValue = raw === "" ? 0 : Math.max(0, Number(raw) || 0);
    onUpdateProject({ ...project, [field]: nextValue });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card icon={<Wallet />} label="Presupuesto interno (BAC)" value={money(totals.bac)} note={`Ejecutado: ${totals.bac ? Math.round(totals.ac / totals.bac * 100) : 0}%`} />
        <Card icon={<TrendingUp />} label="CPI del portafolio" value={totals.cpi === null ? "—" : totals.cpi.toFixed(2)} note={totals.cpi === null ? "Sin costo real registrado" : totals.cpi >= 1 ? "Eficiente" : totals.cpi >= .95 ? "Alerta" : "Sobrecosto"} />
        <Card icon={<AlertTriangle />} label="Proyectos en sobrecosto" value={totals.overcost} note="CPI menor a 0.95" danger={totals.overcost > 0} />
        <Card icon={<DollarSign />} label="Margen proyectado" value={money(totals.margin)} note={`CAPEX venta: ${money(totals.capexVenta)}`} danger={totals.margin < 0} />
      </div>

      <div className="glass-card rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-black text-navy">Proyecto</label>
        <select value={selected?.id || ""} onChange={(e) => setSelectedId(e.target.value)} className="px-3 py-2 border rounded-xl text-xs font-bold">
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <span className="ml-auto px-3 py-1 rounded-full bg-nashville/20 text-navy text-xs font-bold">
          Próximo corte: Quincenal — cada 15 días
        </span>
      </div>

      {totals.missingTrmCount > 0 && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-800">
          ⚠ {totals.missingTrmCount} proyecto(s) con valores USD sin TRM configurada; se excluyen de los totales EVM hasta completar la TRM.
        </div>
      )}

      {selected && (
        <BudgetDetail 
          project={selected} 
          update={update} 
          onOpenProjectDetail={onOpenProjectDetail} 
        />
      )}

      <div className="glass-card rounded-3xl border border-slate-200 overflow-x-auto flex flex-col">
        <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-500 border-b border-slate-200">
          Selecciona una fila para editar BAC y AC por moneda en el panel de configuración superior.
        </div>
        <table className="w-full min-w-[1350px] text-xs">
          <thead className="bg-navy text-white select-none">
            <tr>
              {BUDGET_COLUMNS.map((col) => (
                <th
                  key={col.id}
                  className={`p-3 ${col.align} text-white font-semibold`}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === "text-right" ? "justify-end w-full" : "justify-between w-full"}`}>
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => {
              const m = getProjectBudgetMetrics(project) || {};
              return (
                <tr
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  className={`${index % 2 ? "bg-slate-50" : "bg-white"} cursor-pointer hover:bg-nashville/10 ${selected?.id === project.id ? "ring-1 ring-inset ring-nashville" : ""}`}
                >
                  <td className="p-3 font-bold text-navy text-left">{project.name}</td>
                  <td className="p-3 text-right">{project.realProgress !== undefined && project.realProgress !== "" ? `${project.realProgress}%` : "—"}</td>
                  <td className="p-3 text-right">{money(m.capexVenta)}</td>
                  <td className="p-3 text-right">{money(m.bac)}</td>
                  <td className="p-3 text-right">{money(m.ev)}</td>
                  <td className="p-3 text-right">{money(m.ac)}</td>
                  <td className="p-3 text-right font-black">{(typeof m.cpi === "number" && !isNaN(m.cpi)) ? m.cpi.toFixed(2) : "—"}</td>
                  <td className="p-3 text-right">{money(m.cv)}</td>
                  <td className="p-3 text-right">{money(m.eac)}</td>
                  <td className="p-3 text-right font-bold">{money(m.margin)}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-1 rounded-full font-bold ${statusStyle[m.status] || "bg-slate-100 text-slate-700"}`}>
                      {m.status || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 font-black border-t-2">
              <td className="p-3">TOTAL PORTAFOLIO</td>
              <td></td>
              <td className="p-3 text-right">{money(totals.capexVenta)}</td>
              <td className="p-3 text-right">{money(totals.bac)}</td>
              <td className="p-3 text-right">{money(totals.ev)}</td>
              <td className="p-3 text-right">{money(totals.ac)}</td>
              <td className="p-3 text-right">{totals.cpi === null ? "—" : totals.cpi.toFixed(2)}</td>
              <td className="p-3 text-right">{money(totals.ev - totals.ac)}</td>
              <td className="p-3 text-right">{money(totals.eac)}</td>
              <td className="p-3 text-right">{money(totals.margin)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

function Card({ icon, label, value, note, danger }) { 
  return (
    <div className={`glass-card glass-glow card-hover p-5 rounded-2xl min-h-[145px] border transition-all ${danger ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex justify-between text-slate-500">
        <span className="text-[11px] font-black uppercase">{label}</span>
        {React.cloneElement(icon, { className: danger ? "w-4 h-4 text-rose-600" : "w-4 h-4 text-emerald-600" })}
      </div>
      <p className="mt-3 text-2xl font-black text-navy break-words">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{note}</p>
    </div>
  );
}

function BudgetDetail({ project, update, onOpenProjectDetail }) { 
  if (!project) return null;
  const m = getProjectBudgetMetrics(project) || {}; 
  const operador = project.operadorRed || project.operator || "No asignado";
  const responsable = project.manager || "No asignado";

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200 space-y-4">
      {/* Header with Project Info and Ficha del Proyecto button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-navy text-base">Corte y Seguimiento Presupuestal — {project.name}</h3>
            {m.missingTrm && <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">⚠ Falta TRM</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span>OR: <b>{operador}</b></span>
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Ing. Proyecto: <b>{responsable}</b></span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 text-[11px]">Los parámetros maestros (BAC, CAPEX, TRM) son informativos y se configuran en la Ficha del Proyecto.</span>
          </div>
        </div>

        {onOpenProjectDetail && (
          <button
            type="button"
            onClick={() => onOpenProjectDetail(project)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-navy text-lemony hover:bg-navy-dark shadow-xs transition-all cursor-pointer shrink-0"
            title="Abrir la Ficha del Proyecto para editar TRM, BAC, CAPEX y datos generales"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Ficha del Proyecto</span>
          </button>
        )}
      </div>

      {/* Grid: Informative Master Data Cards + Editable AC Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Informativo: TRM Proyecto */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase">TRM Proyecto</span>
          <div className="mt-1">
            <span className="text-sm font-black text-navy">
              {Number(project.trmProyecto) > 0 ? `$${Number(project.trmProyecto).toLocaleString("es-CO")}` : "No registrada"}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Tasa pactada del proyecto</span>
          </div>
        </div>

        {/* Informativo: BAC COP */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase">BAC COP (Línea Base)</span>
          <div className="mt-1">
            <span className="text-sm font-black text-navy">{formatCurrencyCop(project.bacCOP || 0)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Presupuesto interno COP</span>
          </div>
        </div>

        {/* Informativo: BAC USD */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase">BAC USD (Línea Base)</span>
          <div className="mt-1">
            <span className="text-sm font-black text-blue-900">{formatCurrencyUsd(project.bacUSD || 0)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Presupuesto interno USD</span>
          </div>
        </div>

        {/* Editable: AC COP (Costo Real) */}
        <div className="p-3 bg-emerald-50/40 rounded-xl border-2 border-emerald-300 flex flex-col justify-between shadow-2xs">
          <label className="text-[11px] font-black text-emerald-900 uppercase flex items-center justify-between">
            <span>AC COP (Costo Real) *</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold">Manual</span>
          </label>
          <div className="mt-1">
            <input 
              type="number" 
              min="0" 
              step="any" 
              value={project.acCOP || ""} 
              placeholder="0" 
              onChange={(e) => update(project, "acCOP", e.target.value)} 
              className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-lg text-xs font-black text-emerald-950 focus:outline-none" 
            />
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 truncate">
              {formatCurrencyCop(project.acCOP || 0)}
            </span>
          </div>
        </div>

        {/* Editable: AC USD (Costo Real) */}
        <div className="p-3 bg-blue-50/40 rounded-xl border-2 border-blue-300 flex flex-col justify-between shadow-2xs">
          <label className="text-[11px] font-black text-blue-900 uppercase flex items-center justify-between">
            <span>AC USD (Costo Real) *</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-blue-200 text-blue-900 rounded font-bold">Manual</span>
          </label>
          <div className="mt-1">
            <input 
              type="number" 
              min="0" 
              step="any" 
              value={project.acUSD || ""} 
              placeholder="0" 
              onChange={(e) => update(project, "acUSD", e.target.value)} 
              className="w-full px-2.5 py-1.5 bg-white border border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-xs font-black text-blue-950 focus:outline-none" 
            />
            <span className="text-[10px] text-blue-700 font-semibold block mt-0.5 truncate">
              {formatCurrencyUsd(project.acUSD || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600">
        <div>
          BAC blended: <b>{money(m.bac)}</b> · AC blended: <b>{money(m.ac)}</b> · CAPEX venta: <b>{money(m.capexVenta)}</b>
        </div>
        <div className="text-[11px] text-slate-500">
          💡 Ingresa el Costo Real acumulado a la fecha de corte quincenal.
        </div>
      </div>
    </div>
  );
}
