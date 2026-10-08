import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
  MessageSquareText,
  Package,
  Sun,
  Sliders,
  Box,
  Cpu,
  Zap,
  CheckCircle2,
  FileText,
  Calendar,
  Layers
} from "lucide-react";
import {
  getEquipmentReportData,
  generateEquipmentReportText
} from "../utils/equipmentReportService";
import { formatDate } from "../utils/calculations";

export function EquipmentReportModal({
  isOpen,
  onClose,
  projects = [],
  portfolioName = ""
}) {
  const [activeTab, setActiveTab] = useState("visual"); // "visual" | "text"
  const [copied, setCopied] = useState(false);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const reportData = useMemo(() => {
    return getEquipmentReportData(projects, portfolioName);
  }, [projects, portfolioName]);

  const reportText = useMemo(() => {
    return generateEquipmentReportText(projects, portfolioName);
  }, [projects, portfolioName]);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = reportText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Error al copiar texto:", err);
    }
  };

  const handleDownloadTxt = () => {
    const cleanPortfolio = (portfolioName || "Portafolio").replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Informe_Equipos_${cleanPortfolio}_${dateStr}.txt`;
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const getEquipmentIcon = (typeId) => {
    switch (typeId) {
      case "paneles":      return <Sun className="w-4 h-4 text-amber-500" />;
      case "trackers":     return <Sliders className="w-4 h-4 text-blue-500" />;
      case "shelter":      return <Box className="w-4 h-4 text-purple-500" />;
      case "inversores":   return <Cpu className="w-4 h-4 text-indigo-500" />;
      case "reconectador": return <Zap className="w-4 h-4 text-amber-500" />;
      default:             return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRiskBadge = (riskLevel) => {
    switch (riskLevel) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
            Crítico
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
            Alto
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">
            Atención
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-navy text-white flex flex-wrap items-center justify-between gap-3 border-b border-navy-light">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15">
              <Package className="w-6 h-6 text-lemony" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-lemony text-navy">
                  Mini Informe
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  {reportData.portfolioName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Estado de Equipos, Alertas y Comentarios
              </h2>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-navy hover:bg-lemony hover:text-navy"
              }`}
              title="Copiar informe en texto limpio para WhatsApp / Teams"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "¡Copiado!" : "Copiar"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all shadow-xs cursor-pointer border border-white/15"
              title="Descargar como archivo de texto .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar .TXT</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "visual"
                  ? "bg-white text-navy shadow-xs"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              📊 Vista Resumen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "text"
                  ? "bg-white text-navy shadow-xs"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              📋 Texto para Compartir
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Proyectos: <b className="text-navy">{reportData.projectCount}</b> | Alertas:{" "}
            <b className={reportData.totalBottlenecks > 0 ? "text-rose-600" : "text-emerald-600"}>
              {reportData.totalBottlenecks}
            </b>{" "}
            | Observaciones: <b className="text-navy">{reportData.totalNotesCount}</b>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === "visual" ? (
            <>
              {/* Overall KPI Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Equipos en Sitio</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                    {reportData.totals.totalOnSite}
                    <span className="text-xs font-semibold text-slate-400 ml-1">
                      / {reportData.totals.totalEquipments} ({reportData.totals.overallPercentageOnSite}%)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">En Tránsito / Aduana</div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                    {reportData.totals.totalInTransit}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">En Fabricación</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                    {reportData.totals.totalInManufacture}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  reportData.totals.totalDelayed > 0 
                    ? "bg-rose-50 border-rose-200 text-rose-900" 
                    : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="text-[11px] font-bold uppercase text-slate-500">Equipos Retrasados</div>
                  <div className={`text-xl sm:text-2xl font-black mt-1 ${
                    reportData.totals.totalDelayed > 0 ? "text-rose-600" : "text-slate-700"
                  }`}>
                    {reportData.totals.totalDelayed > 0 ? `⚠️ ${reportData.totals.totalDelayed}` : "0"}
                  </div>
                </div>
              </div>

              {/* Breakdown by Equipment Type */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-nashville" />
                  <span>Avance por Tipo de Equipo</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reportData.metrics.map(({ type, summary }) => (
                    <div
                      key={type.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getEquipmentIcon(type.id)}
                          <span className="text-xs font-black text-navy uppercase tracking-wide">
                            {type.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-navy">
                          {summary.enSitio} / {summary.total}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-navy rounded-full transition-all duration-300"
                          style={{ width: `${summary.percentageOnSite}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>{summary.percentageOnSite}% en sitio</span>
                        {summary.retrasado > 0 ? (
                          <span className="text-rose-600 font-bold">⚠️ {summary.retrasado} retrasado(s)</span>
                        ) : (
                          <span className="text-slate-400">
                            {summary.enTransito + summary.enNacionalizacion} en ruta
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottlenecks and Alerts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Alertas y Cuellos de Botella Logísticos ({reportData.totalBottlenecks})</span>
                  </h3>
                </div>

                {reportData.bottlenecksByProject.length === 0 && reportData.procurementAlerts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>No se detectaron inconsistencias críticas ni cuellos de botella en este portafolio.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportData.bottlenecksByProject.map((proj) => (
                      <div
                        key={proj.projectId}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-black text-navy">{proj.projectName}</span>
                          {proj.fpo && (
                            <span className="text-[11px] text-slate-500">
                              FPO: <b className="text-slate-700">{formatDate(proj.fpo)}</b>
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {proj.bottlenecks.map((b, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-start justify-between gap-2 text-xs"
                            >
                              <div className="space-y-1 flex-1 min-w-[200px]">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-navy">{b.equipmentName}</span>
                                  {getRiskBadge(b.riskLevel)}
                                  <span className="text-[11px] text-slate-500">
                                    Estado: <b className="text-slate-700">{b.status}</b>
                                  </span>
                                </div>
                                <p className="text-slate-700 font-medium">{b.reason}</p>
                              </div>

                              <div className="text-[11px] text-slate-500 space-y-0.5 text-right shrink-0">
                                {b.edt && <div>EDT: <b className="text-slate-700">{formatDate(b.edt)}</b></div>}
                                {b.eta && <div>ETA: <b className="text-slate-700">{formatDate(b.eta)}</b></div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Equipment Notes and Comments Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                  <MessageSquareText className="w-4 h-4 text-amber-500" />
                  <span>Comentarios y Observaciones de Equipos ({reportData.totalNotesCount})</span>
                </h3>

                {reportData.equipmentNotes.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    ℹ️ No se han registrado observaciones o notas adicionales en los equipos de este portafolio. Puedes agregarlas haciendo clic en el icono de mensaje en cada celda de la tabla.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportData.equipmentNotes.map((proj) => (
                      <div
                        key={proj.projectId}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-black text-navy">{proj.projectName}</span>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            {proj.notes.length} nota(s)
                          </span>
                        </div>

                        <div className="space-y-2">
                          {proj.notes.map((n, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 font-bold text-navy">
                                  {getEquipmentIcon(n.equipmentId)}
                                  <span>{n.equipmentName}</span>
                                  <span className="text-slate-400 font-normal">({n.status})</span>
                                </div>
                                {(n.edt || n.eta) && (
                                  <span className="text-[10px] text-slate-500">
                                    {n.eta ? `ETA: ${formatDate(n.eta)}` : `EDT: ${formatDate(n.edt)}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-800 italic font-medium pl-1">
                                "{n.notes}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Plain Text Mode for WhatsApp / Teams */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Formato preparado para copiar y pegar en WhatsApp, Teams, Slack o Correo Electrónico:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-navy text-white hover:bg-navy-dark"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "¡Copiado!" : "Copiar Texto"}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={reportText}
                rows={18}
                className="w-full font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy/20 select-all leading-relaxed resize-none shadow-inner"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            * Información calculada en tiempo real según la matriz de equipos y FPO de cada proyecto
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
