import React, { memo, useMemo, useState, useRef } from "react";
import {
  X,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Percent,
  Download,
  Copy,
  Check,
  Loader2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert
} from "lucide-react";
import { toPng } from "html-to-image";
import { formatCurrencyCop, formatCurrencyUsd } from "../utils/calculations";
import { getPortfolioBudgetMetrics, getProjectBudgetMetrics } from "../utils/budgetCalculations";

const statusStyle = {
  Saludable: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "En riesgo": "bg-amber-100 text-amber-800 border-amber-200",
  Sobrecosto: "bg-rose-100 text-rose-800 border-rose-200",
  "Sin ejecución": "bg-slate-100 text-slate-700 border-slate-200",
  "Falta TRM": "bg-rose-100 text-rose-800 border-rose-200"
};

const money = (val) => (val === null || val === undefined ? "—" : formatCurrencyCop(val));

export const BudgetReportModal = memo(function BudgetReportModal({
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

  const totals = useMemo(() => getPortfolioBudgetMetrics(projects), [projects]);

  // Projects with individual metrics
  const projectMetricsList = useMemo(() => {
    return projects.map((p) => ({
      project: p,
      metrics: getProjectBudgetMetrics(p) || {}
    }));
  }, [projects]);

  // Identify risk projects
  const overcostProjects = useMemo(() => {
    return projectMetricsList.filter(({ metrics }) => metrics.status === "Sobrecosto");
  }, [projectMetricsList]);

  const atRiskProjects = useMemo(() => {
    return projectMetricsList.filter(({ metrics }) => metrics.status === "En riesgo");
  }, [projectMetricsList]);

  // Projects where % spent is significantly higher than real physical progress
  const spendingAheadProjects = useMemo(() => {
    return projectMetricsList.filter(({ project, metrics }) => {
      const real = Number(project.realProgress) || 0;
      const spent = metrics.spentPct || 0;
      return spent > real + 10 && real < 95;
    });
  }, [projectMetricsList]);

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
      link.download = `Informe_Presupuesto_${safeTitle}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG de presupuesto:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopySummary = () => {
    let text = `💰 *INFORME EJECUTIVO DE PRESUPUESTO & EVM*\n`;
    text += `Portafolio: ${portfolioName || "General"}\n`;
    text += `Fecha de corte: ${reportDate}\n`;
    text += `Proyectos evaluados: ${projects.length}\n`;
    text += `──────────────────────────────────────\n`;
    text += `• Presupuesto (BAC): ${money(totals.bac)}\n`;
    text += `• Costo Real (AC): ${money(totals.ac)}\n`;
    text += `• % Presupuesto Gastado: ${totals.spentPct !== null ? totals.spentPct.toFixed(1) : 0}%\n`;
    text += `• Valor Ganado (EV): ${money(totals.ev)}\n`;
    text += `• CPI Portafolio: ${totals.cpi !== null ? totals.cpi.toFixed(2) : "—"}\n`;
    text += `• Variación de Costo (CV): ${money(totals.ev - totals.ac)}\n`;
    text += `• Margen Proyectado: ${money(totals.margin)}\n`;
    text += `• Proyectos en Sobrecosto: ${totals.overcost}\n`;
    text += `──────────────────────────────────────\n\n`;
    text += `*DETALLE POR PROYECTO:*\n`;

    projectMetricsList.forEach(({ project, metrics }) => {
      text += `\n📌 *${project.name}*\n`;
      text += `  - Avance Real: ${project.realProgress || 0}%\n`;
      text += `  - % Gastado: ${metrics.spentPct !== null ? `${metrics.spentPct}%` : "—"}\n`;
      text += `  - BAC: ${money(metrics.bac)} | AC: ${money(metrics.ac)}\n`;
      text += `  - CPI: ${metrics.cpi !== null ? metrics.cpi.toFixed(2) : "—"} (${metrics.status})\n`;
      if (metrics.margin !== null) {
        text += `  - Margen: ${money(metrics.margin)}\n`;
      }
    });

    text += `\n_Generado automáticamente por PMO Control Tracker_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
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
        {/* Top Control Bar (Hidden when printing to PDF) */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy text-lemony flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy leading-tight">
                Mini Informe Ejecutivo de Presupuesto (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {portfolioName ? `Portafolio: ${portfolioName} • ` : ""}
                Análisis de ejecución presupuestal, valor ganado (EVM) y costos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPrintOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printOrientation === "landscape"
                    ? "bg-white text-navy shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Orientación horizontal recomendada para tablas financieras anchas"
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

            {/* Copy Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200"
              title="Copiar resumen del presupuesto para WhatsApp o Teams"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
            </button>

            {/* Download PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Descargar snapshot en imagen PNG"
            >
              {isExportingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExportingPng ? "Generando..." : "Descargar PNG"}</span>
            </button>

            {/* Print / PDF Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark transition-all cursor-pointer shadow-xs"
              title="Imprimir o guardar como documento PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Printable Canvas (Ref used for PNG export & window.print())   */}
        {/* ============================================================== */}
        <div ref={reportRef} className="space-y-5 text-slate-800 bg-white">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-lemony text-navy">
                  PMO CONTROL TRACKER
                </span>
                <span className="text-xs font-semibold text-nashville">
                  Informe Ejecutivo de Presupuesto & EVM
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                {portfolioName || "Portafolio de Proyectos Solares"}
              </h1>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                Diagnóstico y control presupuestal consolidado: Costo Real (AC), Presupuesto Base (BAC), Valor Ganado (EV) e Índices de Desempeño.
              </p>
            </div>

            <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[190px] print:p-2">
              <p className="text-slate-300">
                Fecha de Emisión: <b className="text-white">{reportDate}</b>
              </p>
              <p className="text-slate-300">
                Proyectos Monitoreados: <b className="text-white">{projects.length}</b>
              </p>
              <p className="text-slate-300">
                Frecuencia de Corte: <b className="text-lemony">Quincenal (15 días)</b>
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:gap-2">
            {/* Card 1: BAC */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Presupuesto (BAC)
              </span>
              <p className="text-base sm:text-lg font-black text-navy mt-1 truncate" title={money(totals.bac)}>
                {money(totals.bac)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">Línea base interna</span>
            </div>

            {/* Card 2: Costo Real AC */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Costo Real (AC)
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate" title={money(totals.ac)}>
                {money(totals.ac)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">Gasto acumulado</span>
            </div>

            {/* Card 3: % Presupuesto Gastado */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              totals.spentPct > 100 
                ? "bg-rose-50 border-rose-200 text-rose-900" 
                : totals.spentPct > 90 
                  ? "bg-amber-50 border-amber-200 text-amber-900" 
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  % Presup. Gastado
                </span>
                <Percent className="w-3.5 h-3.5 opacity-70" />
              </div>
              <p className="text-base sm:text-lg font-black mt-1">
                {totals.spentPct !== null ? `${totals.spentPct.toFixed(1)}%` : "0%"}
              </p>
              <div className="w-full bg-slate-200/80 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className={`h-full ${totals.spentPct > 100 ? "bg-rose-600" : totals.spentPct > 90 ? "bg-amber-600" : "bg-emerald-600"}`}
                  style={{ width: `${Math.min(100, Math.max(0, totals.spentPct || 0))}%` }}
                />
              </div>
            </div>

            {/* Card 4: Valor Ganado EV */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Valor Ganado (EV)
              </span>
              <p className="text-base sm:text-lg font-black text-navy mt-1 truncate" title={money(totals.ev)}>
                {money(totals.ev)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">BAC × % Avance Real</span>
            </div>

            {/* Card 5: CPI */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                CPI del Portafolio
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-base sm:text-lg font-black text-navy">
                  {totals.cpi !== null ? totals.cpi.toFixed(2) : "—"}
                </p>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  totals.cpi === null ? "bg-slate-200 text-slate-700" :
                  totals.cpi >= 1 ? "bg-emerald-100 text-emerald-800" :
                  totals.cpi >= 0.95 ? "bg-amber-100 text-amber-800" :
                  "bg-rose-100 text-rose-800"
                }`}>
                  {totals.cpi === null ? "N/D" : totals.cpi >= 1 ? "Eficiente" : totals.cpi >= 0.95 ? "Alerta" : "Sobrecosto"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">Rendimiento Costo (EV/AC)</span>
            </div>

            {/* Card 6: Margen Proyectado */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              totals.margin < 0 ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Margen Proyectado
              </span>
              <p className={`text-base sm:text-lg font-black mt-1 truncate ${totals.margin < 0 ? "text-rose-700" : "text-emerald-700"}`} title={money(totals.margin)}>
                {money(totals.margin)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {totals.marginPct !== null ? `${totals.marginPct}% de venta` : "CAPEX Venta"}
              </span>
            </div>
          </div>

          {/* Missing TRM Warning if any */}
          {totals.missingTrmCount > 0 && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Atención: {totals.missingTrmCount} proyecto(s) con valores en USD no tienen TRM pactada registrada en su Ficha de Proyecto. Han sido excluidos temporalmente del consolidado EVM.
              </span>
            </div>
          )}

          {/* Detailed Budget Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-navy uppercase tracking-wider">
                Matriz de Desempeño Presupuestal por Proyecto ({projects.length})
              </span>
              <span className="text-slate-500 font-medium">Moneda: COP Blended (Incluye USD convertidos a TRM)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-navy text-white font-semibold select-none">
                    <th className="p-2.5 pl-3 text-left">Proyecto</th>
                    <th className="p-2.5 text-right w-[95px]">% Avance</th>
                    <th className="p-2.5 text-right w-[110px]">% Gastado</th>
                    <th className="p-2.5 text-right">CAPEX Venta</th>
                    <th className="p-2.5 text-right">Presup. (BAC)</th>
                    <th className="p-2.5 text-right">Costo Real (AC)</th>
                    <th className="p-2.5 text-right">Valor Ganado (EV)</th>
                    <th className="p-2.5 text-center w-[70px]">CPI</th>
                    <th className="p-2.5 text-right">CV ($)</th>
                    <th className="p-2.5 text-right">Margen Proy.</th>
                    <th className="p-2.5 pr-3 text-center w-[100px]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {projectMetricsList.map(({ project, metrics }, index) => {
                    const realProgress = project.realProgress !== undefined && project.realProgress !== "" ? Number(project.realProgress) : 0;
                    return (
                      <tr
                        key={project.id}
                        className={index % 2 ? "bg-slate-50/70" : "bg-white"}
                      >
                        <td className="p-2.5 pl-3 font-bold text-navy whitespace-nowrap">
                          {project.name}
                        </td>
                        <td className="p-2.5 text-right font-medium">
                          {realProgress}%
                        </td>
                        <td className="p-2.5 text-right">
                          {metrics.spentPct !== null && metrics.spentPct !== undefined ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                                metrics.spentPct > 100
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : metrics.spentPct > 90
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {metrics.spentPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right tabular-nums text-slate-700">
                          {money(metrics.capexVenta)}
                        </td>
                        <td className="p-2.5 text-right tabular-nums font-semibold text-navy">
                          {money(metrics.bac)}
                        </td>
                        <td className="p-2.5 text-right tabular-nums font-semibold text-slate-900">
                          {money(metrics.ac)}
                        </td>
                        <td className="p-2.5 text-right tabular-nums text-slate-700">
                          {money(metrics.ev)}
                        </td>
                        <td className="p-2.5 text-center font-black">
                          {metrics.cpi !== null ? metrics.cpi.toFixed(2) : "—"}
                        </td>
                        <td
                          className={`p-2.5 text-right tabular-nums font-medium ${
                            metrics.cv !== null && metrics.cv < 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {money(metrics.cv)}
                        </td>
                        <td
                          className={`p-2.5 text-right tabular-nums font-bold ${
                            metrics.margin !== null && metrics.margin < 0 ? "text-rose-700" : "text-emerald-800"
                          }`}
                        >
                          {money(metrics.margin)}
                        </td>
                        <td className="p-2.5 pr-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              statusStyle[metrics.status] || "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {metrics.status || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Consolidado Totales Row */}
                  <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300">
                    <td className="p-3 pl-3 text-navy uppercase text-[11px]">
                      TOTAL PORTAFOLIO
                    </td>
                    <td className="p-3 text-right"></td>
                    <td className="p-3 text-right">
                      {totals.spentPct !== null && totals.spentPct !== undefined ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black border ${
                            totals.spentPct > 100
                              ? "bg-rose-100 text-rose-900 border-rose-300"
                              : totals.spentPct > 90
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-emerald-100 text-emerald-900 border-emerald-300"
                          }`}
                        >
                          {totals.spentPct.toFixed(1)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{money(totals.capexVenta)}</td>
                    <td className="p-3 text-right tabular-nums">{money(totals.bac)}</td>
                    <td className="p-3 text-right tabular-nums">{money(totals.ac)}</td>
                    <td className="p-3 text-right tabular-nums">{money(totals.ev)}</td>
                    <td className="p-3 text-center text-xs">
                      {totals.cpi !== null ? totals.cpi.toFixed(2) : "—"}
                    </td>
                    <td
                      className={`p-3 text-right tabular-nums ${
                        totals.ev - totals.ac < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {money(totals.ev - totals.ac)}
                    </td>
                    <td
                      className={`p-3 text-right tabular-nums ${
                        totals.margin < 0 ? "text-rose-700" : "text-emerald-800"
                      }`}
                    >
                      {money(totals.margin)}
                    </td>
                    <td className="p-3 text-center pr-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-navy text-lemony font-black">
                        {totals.overcost > 0 ? `${totals.overcost} en alerta` : "Saludable"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Executive Observations & Alerts Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print-avoid-break">
            {/* Box 1: Proyectos con Desviación Presupuestal */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Alertas de Rendimiento Financiero (CPI &lt; 1.0)</span>
              </h4>
              {overcostProjects.length === 0 && atRiskProjects.length === 0 ? (
                <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  ✅ Todos los proyectos del portafolio registran un desempeño financiero eficiente (CPI ≥ 1.0).
                </p>
              ) : (
                <div className="space-y-1.5">
                  {overcostProjects.map(({ project, metrics }) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between text-xs bg-rose-50 border border-rose-200 p-2 rounded-xl text-rose-900"
                    >
                      <span className="font-bold">{project.name}</span>
                      <span className="font-black text-[11px]">
                        CPI {metrics.cpi?.toFixed(2)} • Sobrecosto: {money(Math.abs(metrics.cv || 0))}
                      </span>
                    </div>
                  ))}
                  {atRiskProjects.map(({ project, metrics }) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 p-2 rounded-xl text-amber-900"
                    >
                      <span className="font-bold">{project.name}</span>
                      <span className="font-black text-[11px]">
                        CPI {metrics.cpi?.toFixed(2)} (En riesgo preventivo)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box 2: Desbalance entre Gasto y Avance Físico */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Consumo Financiero vs. Avance Físico Real</span>
              </h4>
              {spendingAheadProjects.length === 0 ? (
                <p className="text-xs text-slate-600 font-medium bg-white p-2.5 rounded-xl border border-slate-200">
                  ℹ️ El ritmo de desembolso acumulado es consistente con el progreso en sitio en todos los frentes.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {spendingAheadProjects.map(({ project, metrics }) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between text-xs bg-white border border-slate-200 p-2 rounded-xl text-slate-800"
                    >
                      <span className="font-bold">{project.name}</span>
                      <span className="text-[11px] text-slate-600">
                        Gastado: <b className="text-navy">{metrics.spentPct}%</b> vs Avance: <b className="text-slate-900">{project.realProgress || 0}%</b>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Corporate Signatures Block (Printable) */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print-avoid-break">
            <div>
              <p className="font-bold text-slate-900">Control de Gestión & PMO</p>
              <p className="text-[10px] text-slate-400">Oficina de Gestión de Proyectos</p>
            </div>
            <div className="text-right">
              <div className="border-t border-slate-400 pt-1 w-48 text-center">
                <p className="font-bold text-slate-800">Dirección Financiera / Proyectos</p>
                <p className="text-[10px] text-slate-400">Visto Bueno Ejecutivo</p>
              </div>
            </div>
          </div>

          {/* Watermark Footer */}
          <div className="flex justify-between items-center text-[9px] text-slate-400 pt-2 border-t border-slate-100">
            <span>PMO Control Tracker • Informe Oficial de Seguimiento Presupuestal • Confidencial</span>
            <span>Generado el {reportDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
