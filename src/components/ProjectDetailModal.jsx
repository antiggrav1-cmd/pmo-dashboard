import React, { memo, useState, useEffect } from "react";
import { 
  X, 
  Save, 
  Building2, 
  DollarSign, 
  User, 
  FileText, 
  Radio, 
  Coins, 
  Info,
  Check
} from "lucide-react";
import { CONNECTION_STATES } from "../models/projectModel";
import { formatCurrencyCop, formatCurrencyUsd } from "../utils/calculations";
import { ConnectionFlowStepper } from "./ConnectionFlowStepper";

const COMMON_OPERATORS = [
  "Enel Colombia",
  "EPM (Empresas Públicas de Medellín)",
  "Celsia",
  "Air-e",
  "Afinia (Grupo EPM)",
  "CHEC (Caldas)",
  "ESSA (Santander)",
  "EDEQ (Quindío)",
  "Cedenar (Nariño)",
  "Electrohuila",
  "EMSA (Meta)",
  "CEO (Cauca)",
  "Enerca (Casanare)",
  "Dispac (Chocó)"
];

const STATE_ICONS = {
  "DD": "📋",
  "Ingeniería": "📐",
  "Montaje": "🔧",
  "Energizado": "⚡",
  "Entregado": "✅"
};

export const ProjectDetailModal = memo(function ProjectDetailModal({
  isOpen,
  project,
  onSave,
  onClose
}) {
  const [formData, setFormData] = useState({
    name: "",
    xm: "",
    operadorRed: "",
    manager: "",
    residenteCivil: "",
    residenteElectrico: "",
    connectionState: "Ingeniería",
    capexCop: 0,
    capexUsd: 0,
    bacCOP: 0,
    bacUSD: 0,
    trmProyecto: 0
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        xm: project.xm || "",
        operadorRed: project.operadorRed || project.operator || "",
        manager: project.manager || "",
        residenteCivil: project.residenteCivil || "",
        residenteElectrico: project.residenteElectrico || "",
        connectionState: project.connectionState || "Ingeniería",
        capexCop: Number(project.capexCop) || 0,
        capexUsd: Number(project.capexUsd) || 0,
        bacCOP: Number(project.bacCOP) || 0,
        bacUSD: Number(project.bacUSD) || 0,
        trmProyecto: Number(project.trmProyecto) || 0
      });
      setSavedSuccess(false);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, rawValue) => {
    const num = rawValue === "" ? 0 : Math.max(0, Number(rawValue) || 0);
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const updated = {
      ...project,
      name: formData.name.trim(),
      xm: formData.xm.trim(),
      operadorRed: formData.operadorRed.trim(),
      manager: formData.manager.trim(),
      residenteCivil: formData.residenteCivil.trim(),
      residenteElectrico: formData.residenteElectrico.trim(),
      connectionState: formData.connectionState,
      gridConnected: formData.connectionState === "Energizado" || formData.connectionState === "Entregado",
      capexCop: formData.capexCop,
      capexUsd: formData.capexUsd,
      bacCOP: formData.bacCOP,
      bacUSD: formData.bacUSD,
      trmProyecto: formData.trmProyecto
    };

    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="glass-card bg-white rounded-3xl border border-slate-200/90 p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-navy text-lemony shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy leading-tight">
                Ficha del Proyecto
              </h2>
              <span className="text-xs text-slate-500 font-semibold">
                {formData.name || "Configuración de datos maestros"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SECCIÓN 1: DATOS GENERALES Y OPERACIÓN */}
          <section className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center gap-2 text-navy pb-1 border-b border-slate-200/60">
              <Radio className="w-4 h-4 text-lemony-dark" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                1. Datos Generales y Operación
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nombre del Proyecto */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span>Nombre del Proyecto *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ej: Parque Solar La Unión"
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Archivo XM / Código */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Archivo XM / Código</span>
                </label>
                <input
                  type="text"
                  value={formData.xm}
                  onChange={(e) => handleChange("xm", e.target.value)}
                  placeholder="Ej: XM-SUN-042"
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Operador de Red (OR) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-slate-400" />
                  <span>Operador de Red (OR)</span>
                </label>
                <input
                  type="text"
                  list="operadores-red-list"
                  value={formData.operadorRed}
                  onChange={(e) => handleChange("operadorRed", e.target.value)}
                  placeholder="Ej: Enel Colombia, EPM, Celsia..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <datalist id="operadores-red-list">
                  {COMMON_OPERATORS.map((op) => (
                    <option key={op} value={op} />
                  ))}
                </datalist>
              </div>

              {/* Ing. de Proyecto (Responsable) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ing. de Proyecto (Responsable)</span>
                </label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => handleChange("manager", e.target.value)}
                  placeholder="Ej: Ing. Laura Ríos"
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Ing. Residente Civil */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ing. Residente Civil</span>
                </label>
                <input
                  type="text"
                  value={formData.residenteCivil}
                  onChange={(e) => handleChange("residenteCivil", e.target.value)}
                  placeholder="Ej: Ing. Juan Pérez"
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Ing. Residente Eléctrico */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ing. Residente Eléctrico</span>
                </label>
                <input
                  type="text"
                  value={formData.residenteElectrico}
                  onChange={(e) => handleChange("residenteElectrico", e.target.value)}
                  placeholder="Ej: Ing. María González"
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Estado del Proyecto - Secuencia de Flujo */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-navy block">
                  Secuencia / Estado del Proyecto
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy text-lemony shadow-2xs">
                  {formData.connectionState}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <ConnectionFlowStepper
                  currentState={formData.connectionState}
                  onChangeState={(nextState) => handleChange("connectionState", nextState)}
                  interactive={true}
                  compact={false}
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: PARÁMETROS FINANCIEROS Y PRESUPUESTO (EVM) */}
          <section className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <div className="flex items-center gap-2 text-navy">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  2. Parámetros Financieros y Presupuesto (EVM)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Línea Base Maestra</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* CAPEX COP (Venta) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  CAPEX COP (Venta / Cliente)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.capexCop || ""}
                    onChange={(e) => handleNumberChange("capexCop", e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {formatCurrencyCop(formData.capexCop)}
                </span>
              </div>

              {/* CAPEX USD (Venta) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  CAPEX USD (Venta / Cliente)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">US$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.capexUsd || ""}
                    onChange={(e) => handleNumberChange("capexUsd", e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {formatCurrencyUsd(formData.capexUsd)}
                </span>
              </div>

              {/* BAC COP (Presupuesto) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  BAC COP (Presupuesto Interno)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.bacCOP || ""}
                    onChange={(e) => handleNumberChange("bacCOP", e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {formatCurrencyCop(formData.bacCOP)}
                </span>
              </div>

              {/* BAC USD (Presupuesto) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  BAC USD (Presupuesto Interno)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">US$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.bacUSD || ""}
                    onChange={(e) => handleNumberChange("bacUSD", e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {formatCurrencyUsd(formData.bacUSD)}
                </span>
              </div>

              {/* TRM del Proyecto */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  <span>TRM del Proyecto (COP/USD)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.trmProyecto || ""}
                    onChange={(e) => handleNumberChange("trmProyecto", e.target.value)}
                    placeholder="Ej: 4150"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Tasa pactada para conversiones combinadas del proyecto.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-blue-900 text-[11px]">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                El <strong>Costo Real (AC COP / AC USD)</strong> se carga y actualiza periódicamente en cada corte quincenal dentro de la pestaña <strong>Presupuesto</strong>.
              </span>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer ${
                savedSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-navy text-lemony hover:bg-navy-dark"
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Ficha Guardada!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Ficha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
