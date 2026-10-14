import React, { memo, useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  CalendarClock,
  PackageX,
  DollarSign,
  ShieldAlert,
  Building2
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  getCregRegulatoryRisk,
  getFpoScheduleRisk,
  getPendingBillingAlerts,
  formatDate,
  formatCurrencyCop,
  formatCurrencyUsd
} from "../utils/calculations";
import { getAllPortfolioBottlenecks, getEquipmentProcurementAlerts } from "../services/equipmentService";

export const AlertsReportModal = memo(function AlertsReportModal({
  isOpen,
  onClose,
  projects = [],
  portfolioName = ""
}) {
  const [printOrientation, setPrintOrientation] = useState("landscape");
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef(null);

  const reportDate = useMemo(() => {
    return new Date().toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, []);

  // Manage print class isolation on body
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open-printing");
      if (printOrientation === "landscape") {
        document.body.classList.add("print-landscape");
      } else {
        document.body.classList.remove("print-landscape");
      }
      return () => {
        document.body.classList.remove("modal-open-printing", "print-landscape");
      };
    }
  }, [isOpen, printOrientation]);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate alerts
  const fpoAlerts = useMemo(() => projects
    .map((project) => ({ project, risk: getFpoScheduleRisk(project) }))
    .filter(({ risk }) => risk.isAtRisk), [projects]);

  const billingAlerts = useMemo(() => getPendingBillingAlerts(projects), [projects]);

  const cregAlerts = useMemo(() => projects
    .map((project) => ({ project, risk: getCregRegulatoryRisk(project) }))
    .filter(({ risk }) => risk.riskLevel === "CRITICAL" || risk.riskLevel === "WARNING"), [projects]);

  const bottlenecks = useMemo(() => getAllPortfolioBottlenecks(projects), [projects]);
  const procurementAlerts = useMemo(() => getEquipmentProcurementAlerts(projects), [projects]);

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
          edt: b.edt,
          eta: b.eta,
          notes: b.notes
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
      const alreadyHas = entry.items.some((i) => i.equipmentId === alert.equipmentId);
      if (!alreadyHas) {
        entry.items.push({
          type: "procurement",
          equipmentId: alert.equipmentId,
          equipmentName: alert.equipmentName,
          status: alert.status,
          riskLevel: alert.riskLevel,
          reason: alert.reason,
          edt: alert.edt,
          eta: alert.eta,
          notes: alert.notes
        });
      }
    });

    return Array.from(map.values());
  }, [bottlenecks, procurementAlerts]);

  const totalEquipmentAlerts = useMemo(() => {
    return groupedEquipmentAlerts.reduce((total, p) => total + p.items.length, 0);
  }, [groupedEquipmentAlerts]);

  const totalAlertsCount = useMemo(() => {
    return fpoAlerts.length + billingAlerts.length + cregAlerts.length + totalEquipmentAlerts;
  }, [fpoAlerts, billingAlerts, cregAlerts, totalEquipmentAlerts]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!reportRef.current) return;
    setIsExportingPng(true);
    try {
      const node = reportRef.current;
      const dataUrl = await toPng(node, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          borderRadius: "0px",
          margin: "0px"
        }
      });
      const link = document.createElement("a");
      const safeTitle = (portfolioName || "Portafolio")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `Mini_Informe_Alertas_${safeTitle}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG de alertas:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopySummary = () => {
    let text = `🚨 *REPORTE EJECUTIVO DE ALERTAS CRÍTICAS - PMO*\n`;
    text += `Portafolio: ${portfolioName || "General"}\n`;
    text += `Fecha de corte: ${reportDate}\n`;
    text += `Total Alertas Activas: ${totalAlertsCount}\n`;
    text += `──────────────────────────────────────\n`;
    text += `• Riesgo FPO (Cronograma Crítico): ${fpoAlerts.length}\n`;
    text += `• Riesgo CREG (Regulatorio): ${cregAlerts.length}\n`;
    text += `• Equipos & Cuellos de Botella: ${totalEquipmentAlerts}\n`;
    text += `• Facturación en Trámite (>15d): ${billingAlerts.length}\n`;
    text += `──────────────────────────────────────\n\n`;

    if (fpoAlerts.length > 0) {
      text += `📅 *ALERTAS FPO CRÍTICAS:*\n`;
      fpoAlerts.forEach(({ project, risk }) => {
        text += `• ${project.name}: ${risk.reason} | GAP: ${risk.gap}% | FPO: ${formatDate(project.fpo)}\n`;
      });
      text += `\n`;
    }

    if (cregAlerts.length > 0) {
      text += `⚡ *ALERTAS REGULATORIAS CREG:*\n`;
      cregAlerts.forEach(({ project, risk }) => {
        text += `• ${project.name}: [${risk.riskLevel}] ${risk.message}\n`;
      });
      text += `\n`;
    }

    if (groupedEquipmentAlerts.length > 0) {
      text += `📦 *ALERTAS DE EQUIPOS Y SUMINISTROS:*\n`;
      groupedEquipmentAlerts.forEach((p) => {
        text += `• ${p.projectName} (${p.items.length} alertas):\n`;
        p.items.forEach((it) => {
          text += `  - ${it.equipmentName}: ${it.status} (${it.reason || "Sin justificación"})\n`;
        });
      });
      text += `\n`;
    }

    if (billingAlerts.length > 0) {
      text += `💰 *ALERTAS DE FACTURACIÓN EN TRÁMITE:*\n`;
      billingAlerts.forEach((b) => {
        text += `• ${b.projectName} - ${b.milestoneName}: ${formatCurrencyCop(b.valueCop || 0)} (${b.daysPending} días radicado)\n`;
      });
      text += `\n`;
    }

    text += `_Generado automáticamente por PMO Control Tracker_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`report-print-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible ${
        printOrientation === "landscape" ? "print-landscape" : "print-portrait"
      }`}
    >
      <div
        className={`report-print-content bg-white rounded-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 my-4 max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0 print:overflow-visible ${
          printOrientation === "landscape" ? "max-w-7xl" : "max-w-5xl"
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy leading-tight">
                Mini Informe Ejecutivo de Alertas Críticas (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {portfolioName ? `Portafolio: ${portfolioName} • ` : ""}
                Riesgos FPO, vencimientos regulatorios CREG, suministros y facturación
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPrintOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printOrientation === "landscape"
                    ? "bg-white text-navy shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Horizontal (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation("portrait")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printOrientation === "portrait"
                    ? "bg-white text-navy shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Vertical
              </button>
            </div>

            {/* Copy */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200"
              title="Copiar resumen para WhatsApp o Teams"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? "¡Copiado!" : "Copiar Texto"}</span>
            </button>

            {/* PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Descargar snapshot en imagen PNG"
            >
              {isExportingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExportingPng ? "Generando..." : "Descargar PNG"}</span>
            </button>

            {/* Print / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark transition-all cursor-pointer shadow-xs"
              title="Imprimir o guardar como documento PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div ref={reportRef} className="space-y-5 text-slate-800 bg-white">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                  CENTRO DE CONTROL DE ALERTAS
                </span>
                <span className="text-xs font-semibold text-nashville">
                  Monitoreo de Desviaciones Críticas
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                {portfolioName || "Portafolio de Proyectos"}
              </h1>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                Diagnóstico integral de riesgos con impacto directo en fechas contractuales FPO, garantías regulatorias CREG, cadena de suministro y flujo de caja.
              </p>
            </div>

            <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[190px] print:p-2">
              <p className="text-slate-300">
                Fecha de Emisión: <b className="text-white">{reportDate}</b>
              </p>
              <p className="text-slate-300">
                Total Alertas Detectadas:{" "}
                <b className={totalAlertsCount > 0 ? "text-rose-300 font-black" : "text-emerald-300"}>
                  {totalAlertsCount}
                </b>
              </p>
              <p className="text-slate-300">
                Nivel de Riesgo Global:{" "}
                <b className={totalAlertsCount > 5 ? "text-rose-400" : totalAlertsCount > 0 ? "text-amber-300" : "text-emerald-300"}>
                  {totalAlertsCount > 5 ? "ELEVADO" : totalAlertsCount > 0 ? "MODERADO" : "BAJO"}
                </b>
              </p>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
            {/* Card 1: Riesgo FPO */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              fpoAlerts.length > 0 ? "bg-rose-50/80 border-rose-300 text-rose-950" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Riesgo FPO</span>
                <CalendarClock className="w-3.5 h-3.5 opacity-70 text-rose-600" />
              </div>
              <p className="text-2xl font-black mt-1 text-rose-700">{fpoAlerts.length}</p>
              <span className="text-[10px] opacity-75 mt-0.5">GAP &gt; 15% o fecha en riesgo</span>
            </div>

            {/* Card 2: Riesgo CREG */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              cregAlerts.length > 0 ? "bg-amber-50/80 border-amber-300 text-amber-950" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Riesgo CREG</span>
                <ShieldAlert className="w-3.5 h-3.5 opacity-70 text-amber-600" />
              </div>
              <p className="text-2xl font-black mt-1 text-amber-700">{cregAlerts.length}</p>
              <span className="text-[10px] opacity-75 mt-0.5">Vencimiento vs FPO &le; 45d</span>
            </div>

            {/* Card 3: Equipos */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              totalEquipmentAlerts > 0 ? "bg-indigo-50/80 border-indigo-300 text-indigo-950" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Equipos & Suministros</span>
                <PackageX className="w-3.5 h-3.5 opacity-70 text-indigo-600" />
              </div>
              <p className="text-2xl font-black mt-1 text-indigo-800">{totalEquipmentAlerts}</p>
              <span className="text-[10px] opacity-75 mt-0.5">Cuellos de botella y OC pend.</span>
            </div>

            {/* Card 4: Facturación */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              billingAlerts.length > 0 ? "bg-cyan-50/80 border-cyan-300 text-cyan-950" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Facturación en Trámite</span>
                <DollarSign className="w-3.5 h-3.5 opacity-70 text-cyan-600" />
              </div>
              <p className="text-2xl font-black mt-1 text-cyan-800">{billingAlerts.length}</p>
              <span className="text-[10px] opacity-75 mt-0.5">&gt; 15 días radicado sin recaudo</span>
            </div>
          </div>

          {/* Section 1: Riesgo FPO Table */}
          {fpoAlerts.length > 0 && (
            <div className="rounded-2xl border border-rose-200 overflow-hidden print-avoid-break">
              <div className="bg-rose-50 px-4 py-2 border-b border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-rose-700" />
                  <h3 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                    Alertas de Cronograma y Fecha FPO ({fpoAlerts.length})
                  </h3>
                </div>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase">
                    <th className="py-2 px-3">Proyecto</th>
                    <th className="py-2 px-3 text-center">Fecha FPO</th>
                    <th className="py-2 px-3 text-center">Avance Real vs Prog.</th>
                    <th className="py-2 px-3 text-center">GAP (%)</th>
                    <th className="py-2 px-3">Diagnóstico y Causa Raíz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fpoAlerts.map(({ project, risk }) => (
                    <tr key={project.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-black text-navy">{project.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                        {formatDate(project.fpo)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-900">{project.realProgress || 0}%</span>{" "}
                        <span className="text-slate-400">/ {project.scheduledProgress || 0}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] bg-rose-100 text-rose-800">
                          {risk.gap}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-rose-900 font-medium">
                        {risk.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 2: Riesgo CREG Table */}
          {cregAlerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 overflow-hidden print-avoid-break">
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Alertas Regulatorias CREG & Garantías ({cregAlerts.length})
                  </h3>
                </div>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase">
                    <th className="py-2 px-3">Proyecto</th>
                    <th className="py-2 px-3 text-center">Vencimiento CREG</th>
                    <th className="py-2 px-3 text-center">Fecha FPO</th>
                    <th className="py-2 px-3 text-center">Nivel de Riesgo</th>
                    <th className="py-2 px-3">Detalle Regulatorio y Acción Requerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cregAlerts.map(({ project, risk }) => (
                    <tr key={project.id} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 font-black text-navy">{project.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                        {formatDate(project.creg)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {formatDate(project.fpo)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          risk.riskLevel === "CRITICAL" ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {risk.riskLevel === "CRITICAL" ? "Crítico" : "Advertencia"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-amber-950 font-medium">
                        {risk.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 3: Equipos Table */}
          {groupedEquipmentAlerts.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 overflow-hidden print-avoid-break">
              <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-indigo-700" />
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Cuellos de Botella de Equipos Principales y Suministros ({totalEquipmentAlerts})
                  </h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {groupedEquipmentAlerts.map((p) => (
                  <div key={p.projectId} className="p-3 bg-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-black text-navy text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        {p.projectName}
                      </h4>
                      <span className="text-[10px] text-slate-400">FPO: {formatDate(p.fpo)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {p.items.map((item, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{item.equipmentName}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              {item.status || "Sin estado"}
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-800 font-medium mt-1">
                            {item.reason || "Alerta de suministro detectada"}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span>EDT: {formatDate(item.edt)}</span>
                            <span>ETA: {formatDate(item.eta)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Facturación Table */}
          {billingAlerts.length > 0 && (
            <div className="rounded-2xl border border-cyan-200 overflow-hidden print-avoid-break">
              <div className="bg-cyan-50 px-4 py-2 border-b border-cyan-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-700" />
                  <h3 className="text-xs font-black text-cyan-950 uppercase tracking-wider">
                    Facturación y Cobranza en Trámite Retenida ({billingAlerts.length})
                  </h3>
                </div>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase">
                    <th className="py-2 px-3">Proyecto</th>
                    <th className="py-2 px-3">Hito de Pago</th>
                    <th className="py-2 px-3 text-right">Monto COP</th>
                    <th className="py-2 px-3 text-right">Monto USD</th>
                    <th className="py-2 px-3 text-center">Radicado el</th>
                    <th className="py-2 px-3 text-center">Días en Trámite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billingAlerts.map((b, idx) => (
                    <tr key={idx} className="hover:bg-cyan-50/30">
                      <td className="py-2 px-3 font-bold text-navy">{b.projectName}</td>
                      <td className="py-2 px-3 text-slate-800 font-medium">{b.milestoneName}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">
                        {formatCurrencyCop(b.valueCop || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-900">
                        {b.valueUsd > 0 ? formatCurrencyUsd(b.valueUsd) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 whitespace-nowrap">
                        {formatDate(b.submittedAt)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] bg-rose-100 text-rose-800">
                          {b.daysPending} días
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Zero alerts state */}
          {totalAlertsCount === 0 && (
            <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 space-y-1">
              <Check className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-black text-sm">¡Excelente desempeño! No hay alertas críticas activas.</p>
              <p className="text-xs text-emerald-700">Todos los proyectos cumplen con las fechas de cronograma, CREG, suministros y facturación.</p>
            </div>
          )}

          {/* Print Footer */}
          <div className="print-footer pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>PMO Control Tracker • Mini Informe Ejecutivo de Alertas Críticas</span>
            </div>
            <div>
              <span>Fecha de impresión: {new Date().toLocaleString("es-CO")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
