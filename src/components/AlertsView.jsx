import React, { memo, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, PackageX, Clock, ChevronDown } from "lucide-react";
import { 
  getCregRegulatoryRisk, 
  getFpoScheduleRisk, 
  getPendingBillingAlerts, 
  formatDate, 
  formatCurrencyCop, 
  formatCurrencyUsd 
} from "../utils/calculations";
import { getAllPortfolioBottlenecks, getEquipmentProcurementAlerts } from "../services/equipmentService";
import { CountUpNumber } from "./CountUpNumber";

export const AlertsView = memo(function AlertsView({ projects = [] }) {
  // Collapsible state for each of the 4 sections
  const [openSections, setOpenSections] = useState({
    fpo: true,
    equipment: true,
    creg: true,
    billing: true
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // FPO Schedule risk alerts (strictly Riesgo de incumplimiento FPO con GAP > 15%)
  const fpoAlerts = useMemo(() => projects
    .map((project) => ({ project, risk: getFpoScheduleRisk(project) }))
    .filter(({ risk }) => risk.isAtRisk), [projects]);

  // Facturación Estancada (> 15 días en trámite)
  const billingAlerts = useMemo(() => getPendingBillingAlerts(projects), [projects]);

  // CREG Regulatory alerts (CRITICAL or WARNING based on Ven. CREG vs FPO <= 45 days)
  const cregAlerts = useMemo(() => projects
    .map((project) => ({ project, risk: getCregRegulatoryRisk(project) }))
    .filter(({ risk }) => risk.riskLevel === "CRITICAL" || risk.riskLevel === "WARNING"), [projects]);

  // Equipment bottlenecks
  const bottlenecks = useMemo(() => getAllPortfolioBottlenecks(projects), [projects]);
  const totalBottlenecks = useMemo(() => bottlenecks.reduce((total, item) => total + item.bottlenecks.length, 0), [bottlenecks]);

  // Procurement alerts: "No pedido" and "Pendiente OC" equipment regardless of ETA/FPO
  const procurementAlerts = useMemo(() => getEquipmentProcurementAlerts(projects), [projects]);

  // Combined equipment alert count
  const totalEquipmentAlerts = totalBottlenecks + procurementAlerts.length;

  // Group all equipment issues (bottlenecks + procurement) by project
  const groupedEquipmentAlerts = useMemo(() => {
    const map = new Map();

    bottlenecks.forEach((item) => {
      if (!map.has(item.projectId)) {
        map.set(item.projectId, {
          projectId: item.projectId,
          projectName: item.projectName,
          fpo: item.fpo,
          items: []
        });
      }
      const entry = map.get(item.projectId);
      item.bottlenecks.forEach((b) => {
        entry.items.push({
          type: "bottleneck",
          equipmentId: b.equipmentId,
          equipmentName: b.equipmentName,
          status: b.status,
          riskLevel: b.riskLevel,
          reason: b.reason,
          eta: b.eta
        });
      });
    });

    procurementAlerts.forEach((alert) => {
      if (!map.has(alert.projectId)) {
        map.set(alert.projectId, {
          projectId: alert.projectId,
          projectName: alert.projectName,
          fpo: alert.fpo,
          items: []
        });
      }
      const entry = map.get(alert.projectId);
      entry.items.push({
        type: "procurement",
        equipmentId: alert.equipmentId,
        equipmentName: alert.equipmentName,
        status: alert.status,
        riskLevel: alert.riskLevel,
        reason: alert.reason,
        eta: alert.eta,
        brand: alert.brand,
        notes: alert.notes
      });
    });

    return Array.from(map.values());
  }, [bottlenecks, procurementAlerts]);

  return (
    <div className="space-y-5">
      {/* 4 Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Riesgo FPO */}
        <div className={`glass-card glass-glow card-hover p-4 rounded-2xl border shadow-brand/5 transition-all ${fpoAlerts.some(a => a.risk.riskLevel === "CRITICAL") ? "border-rose-300/80 bg-rose-50/30" : "border-slate-200/80"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
              <CalendarClock className="w-4 h-4 text-rose-600" />
              <span>Riesgo FPO</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100/90 text-rose-900 border border-rose-200/70">
              GAP &gt; 15%
            </span>
          </div>
          <p className="text-2xl font-black text-navy mt-2">
            <CountUpNumber value={fpoAlerts.length} />
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Proyectos con riesgo FPO por atraso crítico (&gt; 15%) o vencimiento.
          </p>
        </div>

        {/* Card 2: Equipos & Suministros (Cuellos de botella + OC) */}
        <div className={`glass-card glass-glow card-hover p-4 rounded-2xl border shadow-brand/5 transition-all ${totalEquipmentAlerts > 0 ? "border-amber-300/80 bg-amber-50/20" : "border-slate-200/80"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-black text-xs">
              <PackageX className="w-4 h-4 text-amber-600" />
              <span>Equipos & Suministros</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-200/70">
              Equipos
            </span>
          </div>
          <p className="text-2xl font-black text-navy mt-2">
            <CountUpNumber value={totalEquipmentAlerts} />
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Cuellos de botella, retrasos y equipos con OC pendiente o no pedidos.
          </p>
        </div>

        {/* Card 3: Alertas CREG */}
        <div className="glass-card glass-glow card-hover p-4 rounded-2xl border border-slate-200/80 shadow-brand/5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800 font-black text-xs">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span>Alertas CREG</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100/90 text-orange-900 border border-orange-200/70">
              Regulatorio
            </span>
          </div>
          <p className="text-2xl font-black text-navy mt-2">
            <CountUpNumber value={cregAlerts.length} />
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Proyectos con plazo CREG vencido o a menos de 45 días de vencer.
          </p>
        </div>

        {/* Card 4: Facturación en Trámite */}
        <div className={`glass-card glass-glow card-hover p-4 rounded-2xl border shadow-brand/5 transition-all ${billingAlerts.length > 0 ? "border-nashville/40 bg-nashville/5" : "border-slate-200/80"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-navy font-black text-xs">
              <Clock className="w-4 h-4 text-navy-light" />
              <span>Facturación en Trámite</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-nashville/20 text-navy border border-nashville/40">
              Desembolso
            </span>
          </div>
          <p className="text-2xl font-black text-navy mt-2">
            <CountUpNumber value={billingAlerts.length} />
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Hitos en trámite y cuentas de cobro esperando desembolso.
          </p>
        </div>
      </div>

      {/* Main Alert Detail Sections in 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Columna Izquierda: FPO (Arriba) y CREG (Abajo) */}
        <div className="space-y-5">
          {/* SECTION 1: DETALLE DE RIESGO DE INCUMPLIMIENTO FPO */}
          <section className="glass-card rounded-2xl border border-slate-200/80 overflow-hidden min-w-0 transition-all shadow-brand/5 hover:shadow-brand/10">
            <header 
              onClick={() => toggleSection("fpo")}
              className="px-4 py-2.5 bg-rose-50/90 border-b border-rose-100 flex items-center justify-between text-xs font-black text-rose-950 cursor-pointer select-none hover:bg-rose-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-rose-600" />
                <span>Riesgo de incumplimiento FPO</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-rose-900 bg-rose-100/90 px-2 py-0.5 rounded-full border border-rose-200/80">
                  {fpoAlerts.length} alertas
                </span>
                <ChevronDown className={`w-4 h-4 text-rose-800 transition-transform duration-200 ${openSections.fpo ? "rotate-0" : "-rotate-90"}`} />
              </div>
            </header>
            {openSections.fpo && (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {fpoAlerts.length ? (
                  fpoAlerts.map(({ project, risk }) => (
                    <div key={project.id} className="p-3 px-4 hover:bg-rose-50/30 transition-colors flex items-center justify-between gap-3">
                      {/* Proyecto + FPO */}
                      <div className="min-w-0 flex-1">
                        <b className="text-navy text-xs font-bold block truncate">{project.name}</b>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>FPO: <strong className="text-slate-700">{formatDate(project.fpo) || "—"}</strong></span>
                          {risk.daysLeft !== null && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className={risk.daysLeft < 0 ? "text-rose-600 font-bold" : "text-slate-600 font-semibold"}>
                                {risk.daysLeft < 0 ? `Vencido (${Math.abs(risk.daysLeft)}d)` : `${risk.daysLeft}d restantes`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Avance + GAP Badge */}
                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                          <span className="font-bold text-slate-800">{risk.realProgress}%</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-500">{risk.scheduledProgress}% prog</span>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 tabular-nums">
                          GAP {risk.gap > 0 ? `+${risk.gap}%` : `${risk.gap}%`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-slate-500">No hay proyectos con riesgo crítico de incumplimiento FPO (GAP &gt; 15%).</p>
                )}
              </div>
            )}
          </section>

          {/* SECTION 2: DETALLE REGULATORIO CREG */}
          <section className="glass-card rounded-2xl border border-slate-200/80 overflow-hidden min-w-0 transition-all shadow-brand/5 hover:shadow-brand/10">
            <header 
              onClick={() => toggleSection("creg")}
              className="px-4 py-2.5 bg-orange-50/90 border-b border-orange-100 flex items-center justify-between text-xs font-black text-orange-950 cursor-pointer select-none hover:bg-orange-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span>Detalle regulatorio CREG</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-orange-900 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200/80">
                  {cregAlerts.length} alertas
                </span>
                <ChevronDown className={`w-4 h-4 text-orange-800 transition-transform duration-200 ${openSections.creg ? "rotate-0" : "-rotate-90"}`} />
              </div>
            </header>
            {openSections.creg && (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {cregAlerts.length ? (
                  cregAlerts.map(({ project, risk }) => (
                    <div key={project.id} className="p-3 px-4 hover:bg-slate-50/70 transition-colors space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <b className="text-navy text-xs font-bold">{project.name}</b>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${risk.badgeClass}`}>
                          {risk.badgeLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span>FPO: <strong className="text-navy font-semibold">{formatDate(project.fpo) || "No registrada"}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span>Plazo CREG: <strong className="text-navy font-semibold">{formatDate(project.creg) || "No registrada"}</strong></span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{risk.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-slate-500">No hay alertas regulatorias activas.</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Columna Derecha: Equipos (Arriba) y Facturación (Abajo) */}
        <div className="space-y-5">
          {/* SECTION 3: DETALLE DE EQUIPOS Y SUMINISTROS (Cuellos de botella + OC Pendientes) */}
          <section className="glass-card rounded-2xl border border-slate-200/80 overflow-hidden min-w-0 transition-all shadow-brand/5 hover:shadow-brand/10">
            <header 
              onClick={() => toggleSection("equipment")}
              className="px-4 py-2.5 bg-amber-50/90 border-b border-amber-100 flex items-center justify-between text-xs font-black text-amber-950 cursor-pointer select-none hover:bg-amber-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PackageX className="w-4 h-4 text-amber-600" />
                <span>Detalle de equipos y suministros</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200/80">
                  {totalEquipmentAlerts} alertas
                </span>
                <ChevronDown className={`w-4 h-4 text-amber-800 transition-transform duration-200 ${openSections.equipment ? "rotate-0" : "-rotate-90"}`} />
              </div>
            </header>
            {openSections.equipment && (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                {groupedEquipmentAlerts.length > 0 ? (
                  groupedEquipmentAlerts.map((proj) => (
                    <div key={proj.projectId} className="p-3 px-4 hover:bg-slate-50/70 transition-colors space-y-2">
                      {/* Cabecera del Proyecto */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <b className="text-navy text-xs font-bold truncate">{proj.projectName}</b>
                          {proj.fpo && (
                            <span className="text-[10.5px] text-slate-400 font-medium whitespace-nowrap">
                              (FPO: {formatDate(proj.fpo)})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                          {proj.items.length} {proj.items.length === 1 ? "alerta" : "alertas"}
                        </span>
                      </div>

                      {/* Lista de equipos pendientes / alertas del proyecto */}
                      <div className="space-y-1.5 pl-2.5 border-l-2 border-amber-200/80">
                        {proj.items.map((item, idx) => (
                          <div key={`${item.equipmentId}-${idx}`} className="text-[11px] leading-snug space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                item.riskLevel === "CRITICAL"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {item.status || item.riskLevel}
                              </span>
                              <strong className="text-navy">{item.equipmentName}:</strong>
                              <span className="text-slate-700">{item.reason}</span>
                            </div>
                            {(item.eta || item.brand || item.notes) && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1">
                                {item.eta && <span>ETA: <strong className="text-slate-600">{formatDate(item.eta)}</strong></span>}
                                {item.brand && <span>• Marca: <strong className="text-slate-600">{item.brand}</strong></span>}
                                {item.notes && <span className="italic">• {item.notes}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-slate-500">No hay alertas de equipos ni cuellos de botella detectados.</p>
                )}
              </div>
            )}
          </section>

          {/* SECTION 4: FACTURACIÓN EN TRÁMITE */}
          <section className="glass-card rounded-2xl border border-slate-200/80 overflow-hidden min-w-0 transition-all shadow-brand/5 hover:shadow-brand/10">
            <header 
              onClick={() => toggleSection("billing")}
              className="px-4 py-2.5 bg-nashville/15 border-b border-nashville/30 flex items-center justify-between text-xs font-black text-navy cursor-pointer select-none hover:bg-nashville/25 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy-light" />
                <span>Facturación en trámite (Días de espera por desembolso)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-navy bg-nashville/25 px-2 py-0.5 rounded-full border border-nashville/40">
                  {billingAlerts.length} facturas en trámite
                </span>
                <ChevronDown className={`w-4 h-4 text-navy transition-transform duration-200 ${openSections.billing ? "rotate-0" : "-rotate-90"}`} />
              </div>
            </header>
            {openSections.billing && (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {billingAlerts.length ? (
                  billingAlerts.map((item) => (
                    <div key={`${item.projectId}-${item.milestoneId}`} className="p-3 px-4 hover:bg-nashville/5 transition-colors space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <b className="text-navy text-xs font-bold truncate">{item.projectName}</b>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 text-xs font-semibold truncate">{item.milestoneName}</span>
                        </div>
                        <span className={`text-[11px] font-bold whitespace-nowrap px-2 py-0.5 rounded-md ${
                          item.daysInProcess > 15 
                            ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold" 
                            : "text-navy bg-nashville/20 border border-nashville/40"
                        }`}>
                          ⏳ {item.daysInProcess > 0 ? `${item.daysInProcess} días de espera` : "En trámite"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-medium">
                        <span>Radicado: <strong className="text-navy font-semibold">{formatDate(item.submittedAt) || "Sin fecha"}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span>Monto: <strong className="text-navy font-bold">{formatCurrencyCop(item.amountCop)}{item.amountUsd > 0 ? ` / ${formatCurrencyUsd(item.amountUsd)}` : ""}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span>Estado: <strong className="text-navy font-bold">{item.status}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span>Espera desembolso: <strong className="text-navy font-black">{item.daysInProcess} días</strong></span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-slate-500">No hay facturaciones ni hitos en trámite de desembolso.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
});

