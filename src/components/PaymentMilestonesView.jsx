import React, { useState, useMemo, memo, useCallback } from "react";
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  Zap, 
  TrendingUp,
  Building2,
  Calendar,
  SlidersHorizontal
} from "lucide-react";
import { formatCurrencyCop, formatCurrencyUsd, getDaysRemaining, toInputDateFormat } from "../utils/calculations";
import { getDefaultPaymentMilestones } from "../models/projectModel";
import { CurrencyInputCell } from "./cells/CurrencyInputCell";
import { CountUpNumber } from "./CountUpNumber";
import { ConnectionFlowStepper } from "./ConnectionFlowStepper";

const STATUS_COLORS = {
  "Cobrado": "bg-blue-50 text-blue-700 border-blue-200 font-bold",
  "Por cobrar": "bg-amber-50 text-amber-800 border-amber-200 font-bold",
  "En trámite": "bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold",
  "Saldo Pendiente": "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
};

export const PaymentMilestonesView = memo(function PaymentMilestonesView({
  projects = [],
  portfolioName: _portfolioName = "",
  onUpdateProject,
  onOpenProjectDetail
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(() => projects[0]?.id || "");

  // Active project
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const milestones = useMemo(() => {
    if (!currentProject) return [];
    return currentProject.paymentMilestones && currentProject.paymentMilestones.length > 0
      ? currentProject.paymentMilestones
      : getDefaultPaymentMilestones();
  }, [currentProject]);

  // Update a single payment milestone
  const handleMilestoneChange = useCallback((milestoneId, field, value) => {
    if (!currentProject) return;

    let parsedVal = value;
    if (["valueCop", "valueUsd", "percentageCop", "percentageUsd", "saldoPendienteCop", "saldoPendienteUsd"].includes(field)) {
      parsedVal = value === "" ? 0 : Number(value) || 0;
    }

    const updatedMilestones = milestones.map((m) => {
      if (m.id === milestoneId) {
        const next = { ...m, [field]: parsedVal };
        if (field === "percentageCop" && Number(currentProject.capexCop) > 0) {
          next.valueCop = Number((Number(currentProject.capexCop) * parsedVal / 100).toFixed(2));
        }
        if (field === "percentageUsd" && Number(currentProject.capexUsd) > 0) {
          next.valueUsd = Number((Number(currentProject.capexUsd) * parsedVal / 100).toFixed(2));
        }
        if (field === "status" && parsedVal === "En trámite" && !next.submittedAt) {
          next.submittedAt = new Date().toISOString().slice(0, 10);
        }
        if (field === "status" && parsedVal === "Saldo Pendiente") {
          if (next.saldoPendienteCop === undefined) next.saldoPendienteCop = next.valueCop;
          if (next.saldoPendienteUsd === undefined) next.saldoPendienteUsd = next.valueUsd;
        }
        return next;
      }
      return m;
    });

    onUpdateProject({
      ...currentProject,
      paymentMilestones: updatedMilestones
    });
  }, [currentProject, milestones, onUpdateProject]);

  // eslint-disable-next-line no-unused-vars
  const _handleCapexChange = useCallback((field, value) => {
    if (!currentProject) return;
    const capex = value === "" ? 0 : Number(value) || 0;
    const percentageField = field === "capexCop" ? "percentageCop" : "percentageUsd";
    const valueField = field === "capexCop" ? "valueCop" : "valueUsd";
    onUpdateProject({
      ...currentProject,
      [field]: capex,
      paymentMilestones: milestones.map((m) => Number(m[percentageField]) > 0
        ? { ...m, [valueField]: Number((capex * Number(m[percentageField]) / 100).toFixed(2)) }
        : m)
    });
  }, [currentProject, milestones, onUpdateProject]);

  // Add new payment milestone row
  const handleAddMilestone = useCallback(() => {
    if (!currentProject) return;

    const newMilestone = {
      id: `hm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `Nuevo hito de pago`,
      valueCop: 0,
      valueUsd: 0,
      percentageCop: 0,
      percentageUsd: 0,
      status: "Por cobrar",
      submittedAt: ""
    };

    onUpdateProject({
      ...currentProject,
      paymentMilestones: [...milestones, newMilestone]
    });
  }, [currentProject, milestones, onUpdateProject]);

  // Delete a milestone
  const handleDeleteMilestone = useCallback((milestoneId) => {
    if (!currentProject) return;

    const updated = milestones.filter((m) => m.id !== milestoneId);
    onUpdateProject({
      ...currentProject,
      paymentMilestones: updated
    });
  }, [currentProject, milestones, onUpdateProject]);

  // Connection state change
  const handleConnectionStateChange = useCallback((newState) => {
    if (!currentProject) return;
    const isConn = newState === "Energizado" || newState === "Entregado";
    const today = new Date().toISOString().slice(0, 10);
    onUpdateProject({
      ...currentProject,
      connectionState: newState,
      gridConnected: isConn,
      gridConnectionDate: isConn ? (currentProject.gridConnectionDate || today) : currentProject.gridConnectionDate
    });
  }, [currentProject, onUpdateProject]);

  // Handle Grid Connection Date Change
  const handleGridConnectionDateChange = useCallback((dateStr) => {
    if (!currentProject) return;
    onUpdateProject({
      ...currentProject,
      gridConnectionDate: dateStr
    });
  }, [currentProject, onUpdateProject]);

  // Totals calculations for current project
  const { 
    totalCop, 
    totalUsd, 
    totalCobradoCop, 
    totalCobradoUsd, 
    totalEnTramiteCop, 
    totalEnTramiteUsd, 
    totalPorCobrarCop, 
    totalPorCobrarUsd 
  } = useMemo(() => {
    let cop = 0;
    let usd = 0;
    let cobCop = 0;
    let cobUsd = 0;
    let traCop = 0;
    let traUsd = 0;
    let porCop = 0;
    let porUsd = 0;

    milestones.forEach((m) => {
      const vCop = Number(m.valueCop) || 0;
      const vUsd = Number(m.valueUsd) || 0;
      cop += vCop;
      usd += vUsd;

      const st = (m.status || "").toLowerCase();
      if (st.includes("cobrad")) {
        cobCop += vCop;
        cobUsd += vUsd;
      } else if (st.includes("saldo pendiente")) {
        const saldoCop = m.saldoPendienteCop !== undefined && m.saldoPendienteCop !== "" ? Number(m.saldoPendienteCop) || 0 : vCop;
        const saldoUsd = m.saldoPendienteUsd !== undefined && m.saldoPendienteUsd !== "" ? Number(m.saldoPendienteUsd) || 0 : vUsd;
        traCop += saldoCop;
        traUsd += saldoUsd;
        porCop += Math.max(0, vCop - saldoCop);
        porUsd += Math.max(0, vUsd - saldoUsd);
      } else if (st.includes("trámite") || st.includes("tramite")) {
        traCop += vCop;
        traUsd += vUsd;
      } else {
        porCop += vCop;
        porUsd += vUsd;
      }
    });

    return {
      totalCop: cop,
      totalUsd: usd,
      totalCobradoCop: cobCop,
      totalCobradoUsd: cobUsd,
      totalEnTramiteCop: traCop,
      totalEnTramiteUsd: traUsd,
      totalPorCobrarCop: porCop,
      totalPorCobrarUsd: porUsd
    };
  }, [milestones]);

  // Portfolio-wide Grid Connection stats
  const gridStats = useMemo(() => {
    const connected = projects.filter((p) => p.gridConnected).length;
    const total = projects.length;
    return { connected, total, percentage: total > 0 ? Math.round((connected / total) * 100) : 0 };
  }, [projects]);

  return (
    <div className="space-y-5">
      {/* Top Financial & Grid Connection KPI Banner with Glass Glow & Count-Up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Facturado COP */}
        <div className="glass-card glass-glow card-hover p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy">Total COP (Proyecto)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-slate-900">
              <CountUpNumber value={totalCop} format="cop" />
            </span>
            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mt-1 gap-x-2">
              <span className="text-blue-700 font-semibold">Cobrado: {formatCurrencyCop(totalCobradoCop)}</span>
              <span className="text-cyan-700 font-semibold">Trámite: {formatCurrencyCop(totalEnTramiteCop)}</span>
              <span className="text-amber-700 font-semibold">Pend: {formatCurrencyCop(totalPorCobrarCop)}</span>
            </div>
          </div>
        </div>

        {/* Total Facturado USD */}
        <div className="glass-card glass-glow card-hover p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy">Total USD (Proyecto)</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-blue-900">
              <CountUpNumber value={totalUsd} format="usd" />
            </span>
            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mt-1 gap-x-2">
              <span className="text-blue-700 font-semibold">Cobrado: {formatCurrencyUsd(totalCobradoUsd)}</span>
              <span className="text-cyan-700 font-semibold">Trámite: {formatCurrencyUsd(totalEnTramiteUsd)}</span>
              <span className="text-amber-700 font-semibold">Pend: {formatCurrencyUsd(totalPorCobrarUsd)}</span>
            </div>
          </div>
        </div>

        {/* % Recaudo / Cobranza */}
        <div className="glass-card glass-glow card-hover p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy">Efectividad de Cobro</span>
            <TrendingUp className="w-4 h-4 text-lemony-dark" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-navy">
              <CountUpNumber 
                value={totalCop + totalUsd > 0
                  ? Math.round(((totalCobradoCop + totalCobradoUsd * 4000) / (totalCop + totalUsd * 4000)) * 100)
                  : 100} 
                suffix="%" 
              />
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Hitos cobrados vs programados
            </span>
          </div>
        </div>

        {/* Grid Connection Status Card */}
        <div className="glass-card glass-glow card-hover p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy">Conexión a la Red</span>
            <Zap className={`w-4 h-4 ${gridStats.connected > 0 ? "text-lemony-dark" : "text-slate-400"}`} />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy">
                <CountUpNumber value={gridStats.connected} />
                <span className="text-slate-400 font-bold"> / {gridStats.total}</span>
              </span>
              <span className="text-xs font-bold text-emerald-700">
                (<CountUpNumber value={gridStats.percentage} suffix="%" />)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Proyectos energizados y conectados
            </span>
          </div>
        </div>
      </div>

      {/* Connection Sequence Stepper for Selected Project */}
      {currentProject && (
        <div className="glass-card p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-navy">
                Secuencia de Conexión &amp; Estado del Proyecto: <span className="text-slate-800">{currentProject.name}</span>
              </h4>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Estado: <strong className="text-navy">{currentProject.connectionState || "Ingeniería"}</strong>
            </span>
          </div>
          <div className="pt-2 px-2">
            <ConnectionFlowStepper
              currentState={currentProject.connectionState || "Ingeniería"}
              onChangeState={handleConnectionStateChange}
              interactive={true}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Main Payment Milestones Table Card */}
      <div className="glass-card rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Project Selector & Details Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          {/* Project Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-navy" />
              <span className="text-xs font-bold uppercase tracking-wider text-navy">
                Proyecto:
              </span>
            </div>
            <select
              value={currentProject?.id || ""}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer shadow-2xs"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.connectionState ? `(${p.connectionState})` : p.gridConnected ? "(Energizado)" : ""}
                </option>
              ))}
            </select>
          </div>

          {currentProject && (
            <div className="flex flex-wrap items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-bold text-navy text-[11px] uppercase tracking-wide">CAPEX Venta:</span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 font-black text-navy text-xs border border-slate-200/80">
                COP {formatCurrencyCop(currentProject.capexCop || 0)}
              </span>
              {Number(currentProject.capexUsd) > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-blue-50 font-black text-blue-900 text-xs border border-blue-200/80">
                  USD {formatCurrencyUsd(currentProject.capexUsd || 0)}
                </span>
              )}
              {Number(currentProject.trmProyecto) > 0 && (
                <span className="text-[11px] text-slate-500 font-semibold">
                  (TRM: ${Number(currentProject.trmProyecto).toLocaleString("es-CO")})
                </span>
              )}
              {onOpenProjectDetail && (
                <button
                  type="button"
                  onClick={() => onOpenProjectDetail(currentProject)}
                  className="p-1 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Editar CAPEX en la Ficha del Proyecto"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Connection Date for Energizado/Entregado */}
          {currentProject && (currentProject.connectionState === "Energizado" || currentProject.connectionState === "Entregado" || currentProject.gridConnected) && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-navy">Fecha Energización:</span>
              <input
                type="date"
                title="Fecha de conexión / energización"
                value={toInputDateFormat(currentProject.gridConnectionDate)}
                onChange={(e) => handleGridConnectionDateChange(e.target.value)}
                className="text-xs text-slate-800 font-bold bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Payment Milestones Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-navy text-white text-[13px] font-bold select-none">
                {/* Hito de pago */}
                <th className="py-3.5 px-4 border-r border-navy-light text-left min-w-[280px]">
                  Hito de pago
                </th>

                {/* Valor (COP) */}
                <th className="py-3.5 px-4 border-r border-navy-light text-right w-[200px]">
                  % / Valor COP
                </th>

                {/* Valor USD */}
                <th className="py-3.5 px-4 border-r border-navy-light text-right w-[180px]">
                  % / Valor USD
                </th>

                {/* Estado del cobro */}
                <th className="py-3.5 px-4 border-r border-navy-light text-center w-[220px]">
                  Estado / cobro
                </th>

                {/* Acciones */}
                <th className="py-3.5 px-2 text-center w-[50px]">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {milestones.map((milestone, idx) => {
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={milestone.id}
                    className={`hover:bg-slate-50 transition-colors ${isEven ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    {/* Hito de pago (Editable Text) */}
                    <td className="p-2 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="Nombre del hito de pago..."
                        value={milestone.name || ""}
                        onChange={(e) => handleMilestoneChange(milestone.id, "name", e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all"
                      />
                    </td>

                    {/* Valor COP (Formatted Currency Cell) */}
                    <td className="p-2 border-r border-slate-200 text-right">
                      <div className="flex items-center justify-end">
                        <input 
                          type="number" 
                          step="any" 
                          onWheel={(e) => e.currentTarget.blur()} 
                          value={milestone.percentageCop || ""} 
                          onChange={(e) => handleMilestoneChange(milestone.id, "percentageCop", e.target.value)} 
                          placeholder="%" 
                          className="w-12 mr-1 px-1 py-1 text-right text-xs border border-slate-200 rounded" 
                        />
                        <CurrencyInputCell
                          value={milestone.valueCop}
                          currency="COP"
                          onChange={(val) => handleMilestoneChange(milestone.id, "valueCop", val)}
                        />
                      </div>
                    </td>

                    {/* Valor USD (Formatted Currency Cell) */}
                    <td className="p-2 border-r border-slate-200 text-right">
                      <div className="flex items-center justify-end">
                        <input 
                          type="number" 
                          step="any" 
                          onWheel={(e) => e.currentTarget.blur()} 
                          value={milestone.percentageUsd || ""} 
                          onChange={(e) => handleMilestoneChange(milestone.id, "percentageUsd", e.target.value)} 
                          placeholder="%" 
                          className="w-12 mr-1 px-1 py-1 text-right text-xs border border-slate-200 rounded" 
                        />
                        <CurrencyInputCell
                          value={milestone.valueUsd}
                          currency="USD"
                          onChange={(val) => handleMilestoneChange(milestone.id, "valueUsd", val)}
                        />
                      </div>
                    </td>

                    {/* Estado del cobro (Dropdown - 4 states including Saldo Pendiente) */}
                    <td className="p-2 border-r border-slate-200 text-center">
                      <select
                        value={milestone.status || "Por cobrar"}
                        onChange={(e) => handleMilestoneChange(milestone.id, "status", e.target.value)}
                        className={`text-xs px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer w-full shadow-2xs transition-all ${
                          STATUS_COLORS[milestone.status] || STATUS_COLORS["Por cobrar"]
                        }`}
                      >
                        <option value="Cobrado">Cobrado</option>
                        <option value="Por cobrar">Por cobrar</option>
                        <option value="En trámite">En trámite</option>
                        <option value="Saldo Pendiente">Saldo Pendiente</option>
                      </select>

                      {/* State: En trámite date tracker */}
                      {milestone.status === "En trámite" && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-cyan-800 font-semibold bg-cyan-50/80 p-1 rounded-md border border-cyan-100">
                          <span>{milestone.submittedAt ? `${Math.max(0, -(getDaysRemaining(milestone.submittedAt) || 0))}d` : "Envío:"}</span>
                          <input 
                            type="date" 
                            value={toInputDateFormat(milestone.submittedAt)} 
                            onChange={(e) => handleMilestoneChange(milestone.id, "submittedAt", e.target.value)} 
                            className="text-[10px] bg-white border border-cyan-200 rounded px-1 cursor-pointer" 
                          />
                        </div>
                      )}

                      {/* State: Saldo Pendiente editable custom value */}
                      {milestone.status === "Saldo Pendiente" && (
                        <div className="mt-1 space-y-1 bg-purple-50/90 p-1.5 rounded-md border border-purple-200 text-left">
                          <span className="text-[10px] font-bold text-purple-900 block">Monto en trámite:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-purple-700 shrink-0">COP:</span>
                            <CurrencyInputCell
                              value={milestone.saldoPendienteCop !== undefined ? milestone.saldoPendienteCop : milestone.valueCop}
                              currency="COP"
                              className="w-full text-[10px]"
                              onChange={(val) => handleMilestoneChange(milestone.id, "saldoPendienteCop", val)}
                            />
                          </div>
                          {(Number(milestone.valueUsd) > 0 || Number(currentProject?.capexUsd) > 0) && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-purple-700 shrink-0">USD:</span>
                              <CurrencyInputCell
                                value={milestone.saldoPendienteUsd !== undefined ? milestone.saldoPendienteUsd : milestone.valueUsd}
                                currency="USD"
                                className="w-full text-[10px]"
                                onChange={(val) => handleMilestoneChange(milestone.id, "saldoPendienteUsd", val)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action: Delete */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar hito de pago"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Fila de Total */}
              <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                <td className="p-3 px-4 border-r border-slate-300 uppercase tracking-wider text-navy">
                  Total
                </td>
                <td className="p-3 px-4 border-r border-slate-300 text-right text-slate-900 font-extrabold tabular-nums">
                  {formatCurrencyCop(totalCop)}
                </td>
                <td className="p-3 px-4 border-r border-slate-300 text-right text-blue-900 font-extrabold tabular-nums">
                  {formatCurrencyUsd(totalUsd)}
                </td>
                <td className="p-3 px-4 border-r border-slate-300 text-center text-slate-600 font-bold">
                  <div className="flex flex-col text-[11px] leading-tight">
                    <span>{milestones.filter(m => (m.status || "").toLowerCase().includes("cobrad")).length} / {milestones.length} Cobrados</span>
                    {totalEnTramiteCop > 0 || totalEnTramiteUsd > 0 ? (
                      <span className="text-cyan-700 text-[10px] font-semibold">
                        ({milestones.filter(m => (m.status || "").toLowerCase().includes("trámite") || (m.status || "").toLowerCase().includes("tramite") || (m.status || "").toLowerCase().includes("saldo pendiente")).length} En trámite)
                      </span>
                    ) : null}
                  </div>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Add Button */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddMilestone}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-navy text-lemony hover:bg-navy-dark shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Agregar Hito de Pago</span>
          </button>
          <span className="text-xs text-slate-400 font-medium">
            * Valores editables directamente en las casillas
          </span>
        </div>
      </div>
    </div>
  );
});
