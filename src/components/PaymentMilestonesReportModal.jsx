import React, { memo, useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Loader2,
  DollarSign,
  Zap,
  Building2
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  formatCurrencyCop,
  formatCurrencyUsd,
  formatDate,
  getProjectFinancialMetrics,
  getPortfolioFinancials
} from "../utils/calculations";

export const PaymentMilestonesReportModal = memo(function PaymentMilestonesReportModal({
  isOpen,
  onClose,
  projects = [],
  portfolioName = "",
  initialProjectId = ""
}) {
  const [printOrientation, setPrintOrientation] = useState("landscape");
  const [selectedProjectId, setSelectedProjectId] = useState(() => initialProjectId || "all");
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

  // Manage print classes on body
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

  // Financial totals across portfolio
  const portfolioFinancials = useMemo(() => {
    return getPortfolioFinancials(projects);
  }, [projects]);

  // Projects with individual financials
  const projectsData = useMemo(() => {
    return projects.map((p) => {
      const fin = getProjectFinancialMetrics(p);
      const milestones = p.paymentMilestones || [];
      return {
        project: p,
        financials: fin,
        milestones
      };
    });
  }, [projects]);

  // Grid connection stats
  const gridStats = useMemo(() => {
    const connected = projects.filter((p) => p.gridConnected).length;
    const total = projects.length;
    return {
      connected,
      total,
      pct: total > 0 ? Math.round((connected / total) * 100) : 0
    };
  }, [projects]);

  // Filtered view based on selected project
  const isAll = selectedProjectId === "all";
  const currentSelectedProject = useMemo(() => {
    return projectsData.find((p) => p.project.id === selectedProjectId);
  }, [projectsData, selectedProjectId]);

  const activeTotals = useMemo(() => {
    if (isAll || !currentSelectedProject) {
      return {
        totalCop: portfolioFinancials.totalCop,
        totalUsd: portfolioFinancials.totalUsd,
        cobradoCop: portfolioFinancials.cobradoCop,
        cobradoUsd: portfolioFinancials.cobradoUsd,
        enTramiteCop: portfolioFinancials.enTramiteCop,
        enTramiteUsd: portfolioFinancials.enTramiteUsd,
        porCobrarCop: portfolioFinancials.porCobrarCop,
        porCobrarUsd: portfolioFinancials.porCobrarUsd,
        pctCobrado: portfolioFinancials.pctCobrado
      };
    }
    const f = currentSelectedProject.financials;
    return {
      totalCop: f.totalCop,
      totalUsd: f.totalUsd,
      cobradoCop: f.cobradoCop,
      cobradoUsd: f.cobradoUsd,
      enTramiteCop: f.enTramiteCop,
      enTramiteUsd: f.enTramiteUsd,
      porCobrarCop: f.porCobrarCop,
      porCobrarUsd: f.porCobrarUsd,
      pctCobrado: f.pctCobrado
    };
  }, [isAll, currentSelectedProject, portfolioFinancials]);

  // Flat list of milestones to render
  const milestonesToRender = useMemo(() => {
    if (!isAll && currentSelectedProject) {
      return (currentSelectedProject.milestones || []).map((m) => ({
        ...m,
        projectName: currentSelectedProject.project.name
      }));
    }
    return projectsData.flatMap((p) =>
      (p.milestones || []).map((m) => ({
        ...m,
        projectName: p.project.name
      }))
    );
  }, [isAll, currentSelectedProject, projectsData]);

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
      link.download = `Mini_Informe_Facturacion_${safeTitle}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG de facturación:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopySummary = () => {
    let text = `💵 *INFORME EJECUTIVO DE HITOS DE PAGO Y FACTURACIÓN*\n`;
    text += `Portafolio: ${portfolioName || "General"}\n`;
    text += `Fecha de corte: ${reportDate}\n`;
    text += `Alcance: ${isAll ? "Todos los proyectos" : currentSelectedProject?.project.name}\n`;
    text += `──────────────────────────────────────\n`;
    text += `• Total Facturado (COP): ${formatCurrencyCop(activeTotals.totalCop)}\n`;
    if (activeTotals.totalUsd > 0) {
      text += `• Total Facturado (USD): ${formatCurrencyUsd(activeTotals.totalUsd)}\n`;
    }
    text += `• Total Cobrado (COP): ${formatCurrencyCop(activeTotals.cobradoCop)} (${activeTotals.pctCobrado}%)\n`;
    text += `• Facturación en Trámite (COP): ${formatCurrencyCop(activeTotals.enTramiteCop)}\n`;
    text += `• Saldo Por Cobrar (COP): ${formatCurrencyCop(activeTotals.porCobrarCop)}\n`;
    text += `• Proyectos Energizados: ${gridStats.connected} de ${gridStats.total} (${gridStats.pct}%)\n`;
    text += `──────────────────────────────────────\n\n`;

    text += `*HITOS DE PAGO REGISTRADOS:*\n`;
    milestonesToRender.forEach((m, idx) => {
      text += `${idx + 1}. [${m.status || "Por cobrar"}] ${m.projectName} - ${m.name}\n`;
      text += `   • Valor: ${formatCurrencyCop(m.valueCop || 0)}${m.valueUsd > 0 ? ` / ${formatCurrencyUsd(m.valueUsd)}` : ""} (${m.percentageCop || 0}%)\n`;
      if (m.submittedAt) text += `   • Radicado: ${formatDate(m.submittedAt)}\n`;
    });

    text += `\n_Generado automáticamente por PMO Control Tracker_`;

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
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy leading-tight">
                Mini Informe Ejecutivo de Hitos de Pago & Facturación (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {portfolioName ? `Portafolio: ${portfolioName} • ` : ""}
                Control de cobros, recaudos, facturación en trámite e interconexión
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none cursor-pointer"
            >
              <option value="all">Consolidado (Todos los Proyectos)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
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
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-lemony text-navy">
                  PMO CONTROL TRACKER
                </span>
                <span className="text-xs font-semibold text-nashville">
                  Informe Financiero de Facturación y Cobranza
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                {portfolioName || "Portafolio de Proyectos Solares"}
              </h1>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                Trazabilidad integral del flujo de cobros contractuales, hitos radicados ante el cliente, valores recaudados y avance de conexión a red.
              </p>
            </div>

            <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[190px] print:p-2">
              <p className="text-slate-300">
                Fecha de Emisión: <b className="text-white">{reportDate}</b>
              </p>
              <p className="text-slate-300">
                Alcance: <b className="text-white">{isAll ? "Todos los proyectos" : currentSelectedProject?.project.name}</b>
              </p>
              <p className="text-slate-300">
                % Recaudo Efectivo: <b className="text-lemony font-black">{activeTotals.pctCobrado}%</b>
              </p>
            </div>
          </div>

          {/* 5 Financial KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:gap-2">
            {/* Total Facturado COP */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Facturado (COP)
              </span>
              <p className="text-base sm:text-lg font-black text-navy mt-1 truncate" title={formatCurrencyCop(activeTotals.totalCop)}>
                {formatCurrencyCop(activeTotals.totalCop)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {activeTotals.totalUsd > 0 ? `USD ${formatCurrencyUsd(activeTotals.totalUsd)}` : "Monto contractual"}
              </span>
            </div>

            {/* Total Cobrado */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Cobrado
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  {activeTotals.pctCobrado}%
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-950 mt-1 truncate" title={formatCurrencyCop(activeTotals.cobradoCop)}>
                {formatCurrencyCop(activeTotals.cobradoCop)}
              </p>
              <span className="text-[10px] text-emerald-700 mt-0.5">Recaudado efectivamente</span>
            </div>

            {/* En Trámite */}
            <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">
                En Trámite (Radicado)
              </span>
              <p className="text-base sm:text-lg font-black text-cyan-950 mt-1 truncate" title={formatCurrencyCop(activeTotals.enTramiteCop)}>
                {formatCurrencyCop(activeTotals.enTramiteCop)}
              </p>
              <span className="text-[10px] text-cyan-700 mt-0.5">Facturación radicada</span>
            </div>

            {/* Por Cobrar */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Saldo Por Cobrar
              </span>
              <p className="text-base sm:text-lg font-black text-amber-950 mt-1 truncate" title={formatCurrencyCop(activeTotals.porCobrarCop)}>
                {formatCurrencyCop(activeTotals.porCobrarCop)}
              </p>
              <span className="text-[10px] text-amber-700 mt-0.5">Pendiente por radicar</span>
            </div>

            {/* Conexión a Red */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                  Conexión Red
                </span>
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p className="text-base sm:text-lg font-black text-indigo-950 mt-1">
                {gridStats.connected} / {gridStats.total}
              </p>
              <span className="text-[10px] text-indigo-700 mt-0.5">{gridStats.pct}% energizados</span>
            </div>
          </div>

          {/* Project Summary Matrix (if All Projects selected) */}
          {isAll && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden print-avoid-break">
              <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-navy" />
                  <h3 className="text-xs font-black text-navy uppercase tracking-wider">
                    Resumen Financiero Consolidado por Proyecto
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {projectsData.length} Proyectos
                </span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase">
                    <th className="py-2 px-3">Proyecto</th>
                    <th className="py-2 px-3 text-right">CAPEX (COP)</th>
                    <th className="py-2 px-3 text-right">Cobrado</th>
                    <th className="py-2 px-3 text-right">En Trámite</th>
                    <th className="py-2 px-3 text-right">Por Cobrar</th>
                    <th className="py-2 px-3 text-center">% Recaudo</th>
                    <th className="py-2 px-3 text-center">Conexión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectsData.map(({ project, financials }) => (
                    <tr key={project.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-bold text-navy">{project.name}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">
                        {formatCurrencyCop(financials.totalCop)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">
                        {formatCurrencyCop(financials.cobradoCop)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-cyan-800">
                        {financials.enTramiteCop > 0 ? formatCurrencyCop(financials.enTramiteCop) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {formatCurrencyCop(financials.porCobrarCop)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-black text-[10.5px] ${
                          financials.pctCobrado >= 90 ? "bg-emerald-100 text-emerald-800" : financials.pctCobrado >= 50 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          {financials.pctCobrado}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {project.connectionState || (project.gridConnected ? "Energizado" : "Ingeniería")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Payment Milestones Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden print-avoid-break">
            <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-black text-navy uppercase tracking-wider">
                  Detalle de Hitos de Pago ({milestonesToRender.length} Hitos)
                </h3>
              </div>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase">
                  {isAll && <th className="py-2 px-3">Proyecto</th>}
                  <th className="py-2 px-3">Hito de Pago</th>
                  <th className="py-2 px-3 text-right">Valor COP</th>
                  <th className="py-2 px-3 text-right">Valor USD</th>
                  <th className="py-2 px-3 text-center">% Hito</th>
                  <th className="py-2 px-3 text-center">Estado</th>
                  <th className="py-2 px-3 text-center">Fecha Radicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milestonesToRender.length === 0 ? (
                  <tr>
                    <td colSpan={isAll ? 7 : 6} className="py-6 text-center text-slate-400">
                      No hay hitos de pago registrados en este portafolio.
                    </td>
                  </tr>
                ) : (
                  milestonesToRender.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-slate-50/60">
                      {isAll && <td className="py-2 px-3 font-bold text-navy">{m.projectName}</td>}
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        <div>{m.name}</div>
                        {m.notes && (
                          <div className="text-[10px] text-amber-800 bg-amber-50/80 border border-amber-200/60 rounded px-1.5 py-0.5 mt-0.5 inline-block font-normal">
                            <span className="font-semibold">Nota:</span> {m.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">
                        {formatCurrencyCop(m.valueCop || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-900">
                        {m.valueUsd > 0 ? formatCurrencyUsd(m.valueUsd) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-600">
                        {m.percentageCop || 0}%
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          m.status === "Cobrado"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : m.status === "En trámite"
                            ? "bg-cyan-100 text-cyan-800 border-cyan-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}>
                          {m.status || "Por cobrar"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 whitespace-nowrap">
                        {formatDate(m.submittedAt) || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Print Footer */}
          <div className="print-footer pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>PMO Control Tracker • Mini Informe Ejecutivo de Hitos de Pago & Facturación</span>
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
