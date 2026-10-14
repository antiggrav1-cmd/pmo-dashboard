import React, { memo, useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  FileText,
  Download,
  Copy,
  Check,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  calculateGap,
  determineStatus,
  formatDate,
  getPortfolioMetrics
} from "../utils/calculations";
import { generatePortfolioScheduleSummaryText } from "../utils/scheduleReportService";

const getStatusBadge = (status, gap) => {
  if (status === "Completado") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
        <CheckCircle2 className="w-3 h-3" />
        Completado
      </span>
    );
  }
  if (gap < -10 || status === "Atrasado Crítico") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3 h-3" />
        Atrasado Crítico
      </span>
    );
  }
  if (gap < 0 || status === "Rezago Leve") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3" />
        Rezago Leve
      </span>
    );
  }
  if (gap > 5 || status === "Adelantado") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
        <TrendingUp className="w-3 h-3" />
        Adelantado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" />
      En tiempo
    </span>
  );
};

export const ScheduleReportModal = memo(function ScheduleReportModal({
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

  const metrics = useMemo(() => getPortfolioMetrics(projects || []), [projects]);

  const projectItems = useMemo(() => {
    return (projects || []).filter(Boolean).map((p) => {
      const real = Number(p.realProgress) || 0;
      const sched = Number(p.scheduledProgress) || 0;
      const gap = calculateGap(real, sched);
      const status = determineStatus(gap, real);
      return {
        ...p,
        realProgressNum: real,
        scheduledProgressNum: sched,
        gap,
        statusCalc: status
      };
    });
  }, [projects]);

  // Status counts
  const statusCounts = useMemo(() => {
    let completed = 0;
    let critical = 0;
    let slight = 0;
    let onTime = 0;
    let ahead = 0;

    projectItems.forEach((p) => {
      if (p.realProgressNum >= 100 || p.statusCalc === "Completado") completed++;
      else if (p.gap < -10) critical++;
      else if (p.gap < 0) slight++;
      else if (p.gap > 5) ahead++;
      else onTime++;
    });

    return { completed, critical, slight, onTime, ahead, total: projectItems.length };
  }, [projectItems]);

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
      link.download = `Mini_Informe_Cronograma_${safeTitle}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG de cronograma:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopySummary = () => {
    const text = generatePortfolioScheduleSummaryText(projects, portfolioName);
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
            <div className="w-10 h-10 rounded-2xl bg-navy text-lemony flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy leading-tight">
                Mini Informe Ejecutivo de Cronograma y Avances (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {portfolioName ? `Portafolio: ${portfolioName} • ` : ""}
                Control de avance real vs programado, desviaciones GAP y fechas FPO
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
                title="Orientación horizontal recomendada para tablas anchas"
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
              title="Copiar resumen para WhatsApp o Teams"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? "¡Copiado!" : "Copiar Texto"}</span>
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
                  Informe Ejecutivo de Cronograma y Avances
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                {portfolioName || "Portafolio de Proyectos"}
              </h1>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                Control consolidado de hitos de entrega, curvas de avance físico real vs programado, desviaciones GAP y fechas de puesta en operación (FPO).
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
                Desviación Promedio GAP:{" "}
                <b className={(metrics?.avgGap ?? 0) < 0 ? "text-rose-300" : "text-lemony"}>
                  {(metrics?.avgGap ?? 0) > 0 ? `+${metrics.avgGap}%` : `${metrics?.avgGap ?? 0}%`}
                </b>
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:gap-2">
            {/* Card 1: Total Proyectos */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Proyectos
              </span>
              <p className="text-xl sm:text-2xl font-black text-navy mt-1">
                {statusCounts.total}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">En portafolio activo</span>
            </div>

            {/* Card 2: Avance Real Promedio */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Avance Real Prom.
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                {metrics?.avgReal ?? 0}%
              </p>
              <span className="text-[10px] text-emerald-700 mt-0.5">Físico acumulado</span>
            </div>

            {/* Card 3: Avance Programado Promedio */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                Prog. Promedio
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                {metrics?.avgScheduled ?? 0}%
              </p>
              <span className="text-[10px] text-blue-700 mt-0.5">Curva contractual</span>
            </div>

            {/* Card 4: En Tiempo / Adelantados */}
            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                En Tiempo / Adelanto
              </span>
              <p className="text-xl sm:text-2xl font-black text-teal-950 mt-1">
                {statusCounts.onTime + statusCounts.ahead}
              </p>
              <span className="text-[10px] text-teal-700 mt-0.5">
                {statusCounts.total > 0 ? Math.round(((statusCounts.onTime + statusCounts.ahead) / statusCounts.total) * 100) : 0}% del total
              </span>
            </div>

            {/* Card 5: Rezago Leve */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Rezago Leve
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                {statusCounts.slight}
              </p>
              <span className="text-[10px] text-amber-700 mt-0.5">GAP entre 0% y -10%</span>
            </div>

            {/* Card 6: Atraso Crítico */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              statusCounts.critical > 0 ? "bg-rose-50 border-rose-300 text-rose-950" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Atraso Crítico
              </span>
              <p className="text-xl sm:text-2xl font-black mt-1 text-rose-700">
                {statusCounts.critical}
              </p>
              <span className="text-[10px] opacity-75 mt-0.5">GAP &lt; -10% o riesgo FPO</span>
            </div>
          </div>

          {/* Schedule Detail Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden print-avoid-break">
            <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-navy" />
                <h3 className="text-xs font-black text-navy uppercase tracking-wider">
                  Matriz de Control de Avance por Proyecto
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                {projectItems.length} Proyectos Listados
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Proyecto</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-center">Prog. (%)</th>
                  <th className="py-2.5 px-3 text-center">Real (%)</th>
                  <th className="py-2.5 px-3 text-center">GAP (%)</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Fecha FPO</th>
                  <th className="py-2.5 px-3 text-center">Conexión</th>
                  <th className="py-2.5 px-3">Apreciación / Ruta Crítica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 font-medium">
                      No hay proyectos en este portafolio
                    </td>
                  </tr>
                ) : (
                  projectItems.map((p, idx) => (
                    <tr
                      key={p.id || idx}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      } ${p.gap < -10 ? "bg-rose-50/20" : ""}`}
                    >
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        {p.name || "Proyecto sin nombre"}
                        {p.code && <span className="block text-[10px] text-slate-400 font-normal">{p.code}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {p.manager || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {p.scheduledProgressNum}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-navy">
                        {p.realProgressNum}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-black text-[11px] ${
                            p.gap > 0
                              ? "bg-blue-100 text-blue-800"
                              : p.gap < -10
                              ? "bg-rose-100 text-rose-800"
                              : p.gap < 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {p.gap > 0 ? `+${p.gap}%` : `${p.gap}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {getStatusBadge(p.statusCalc, p.gap)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-bold whitespace-nowrap">
                        {formatDate(p.fpo) || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.connectionState || "Ingeniería"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] leading-tight max-w-xs">
                        {p.notes && p.notes.trim() ? p.notes : <span className="text-slate-300 italic">Sin observaciones</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Critical Highlights Box (if any project is critical) */}
          {statusCounts.critical > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 print-avoid-break">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Atención Prioritaria: Proyectos con Atraso Crítico (&gt;10% de GAP)</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {projectItems
                  .filter((p) => p.gap < -10)
                  .map((p) => (
                    <li key={p.id} className="p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-navy">
                        <span>{p.name}</span>
                        <span className="text-rose-700 font-black text-xs">GAP: {p.gap}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Real: {p.realProgressNum}% vs Programado: {p.scheduledProgressNum}% | FPO: {formatDate(p.fpo)}
                      </p>
                      {p.notes && (
                        <p className="text-[11px] text-slate-700 mt-1 italic">
                          "{p.notes}"
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Print Footer */}
          <div className="print-footer pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>PMO Control Tracker • Mini Informe Ejecutivo de Cronograma y Avances</span>
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
