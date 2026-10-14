import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
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
  Layers,
  Search,
  Building2,
  Printer,
  Loader2
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  getEquipmentReportData,
  generateEquipmentReportText
} from "../utils/equipmentReportService";
import { formatDate } from "../utils/calculations";
import { getEquipmentStatusStyle } from "../services/equipmentService";

export const EquipmentReportModal = memo(function EquipmentReportModal({
  isOpen,
  onClose,
  projects = [],
  portfolioName = ""
}) {
  const [activeTab, setActiveTab] = useState("visual"); // "visual" | "text"
  const [projectSearch, setProjectSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [printOrientation, setPrintOrientation] = useState("landscape");
  const [isExportingPng, setIsExportingPng] = useState(false);
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

  const reportData = useMemo(() => {
    return getEquipmentReportData(projects, portfolioName);
  }, [projects, portfolioName]);

  const reportText = useMemo(() => {
    return generateEquipmentReportText(projects, portfolioName);
  }, [projects, portfolioName]);

  const filteredProjectsEquipment = useMemo(() => {
    const list = reportData.allProjectsEquipment || [];
    const term = projectSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => p.projectName.toLowerCase().includes(term));
  }, [reportData.allProjectsEquipment, projectSearch]);

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
      link.download = `Mini_Informe_Equipos_${safeTitle}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG de equipos:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  if (!isOpen) return null;

  const getEquipmentIcon = (typeId) => {
    switch (typeId) {
      case "paneles":      return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case "trackers":     return <Sliders className="w-3.5 h-3.5 text-blue-500" />;
      case "shelter":      return <Box className="w-3.5 h-3.5 text-purple-500" />;
      case "inversores":   return <Cpu className="w-3.5 h-3.5 text-indigo-500" />;
      case "reconectador": return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      default:             return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return createPortal(
    <div
      className={`report-print-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible ${
        printOrientation === "landscape" ? "print-landscape" : "print-portrait"
      }`}
    >
      <div 
        className={`report-print-content bg-white w-full rounded-3xl shadow-2xl border border-slate-100 my-4 max-h-[95vh] overflow-y-auto flex flex-col print:max-w-none print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0 print:overflow-visible ${
          printOrientation === "landscape" ? "max-w-7xl" : "max-w-5xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 sm:p-5 bg-navy text-white flex flex-wrap items-center justify-between gap-3 border-b border-navy-light shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15">
              <Package className="w-6 h-6 text-lemony" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-lemony text-navy">
                  Mini Informe PDF
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  {reportData.portfolioName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Estado Completo de Equipos Principales y Suministros
              </h2>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 text-xs">
              <button
                type="button"
                onClick={() => setPrintOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printOrientation === "landscape"
                    ? "bg-white text-navy shadow-2xs"
                    : "text-slate-300 hover:text-white"
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
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Vertical
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-navy hover:bg-lemony hover:text-navy"
              }`}
              title="Copiar informe completo para WhatsApp / Teams"
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
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Descargar snapshot en imagen PNG"
            >
              {isExportingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExportingPng ? "Generando..." : "Descargar PNG"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-lemony text-navy hover:bg-lemony/80 transition-all cursor-pointer shadow-xs"
              title="Imprimir o guardar como documento PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Toolbar (Hidden when printing) */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
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
              📊 Vista Resumen (Imprimible)
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

          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
            <span>Proyectos: <b className="text-navy">{reportData.projectCount}</b></span>
            <span>•</span>
            <span>Alertas:{" "}
              <b className={reportData.totalBottlenecks > 0 ? "text-rose-600" : "text-emerald-600"}>
                {reportData.totalBottlenecks}
              </b>
            </span>
            <span>•</span>
            <span>Observaciones: <b className="text-navy">{reportData.totalNotesCount}</b></span>
          </div>
        </div>

        {/* Printable Canvas */}
        <div ref={reportRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 print:p-0 print:space-y-4 print:overflow-visible">
          {activeTab === "visual" ? (
            <>
              {/* Header Banner on Printable Area */}
              <div className="p-5 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-lemony text-navy">
                      PMO CONTROL TRACKER
                    </span>
                    <span className="text-xs font-semibold text-nashville">
                      Mini Informe de Equipos Principales y Suministros
                    </span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                    {portfolioName || "Portafolio de Proyectos Solares"}
                  </h1>
                  <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                    Trazabilidad de la cadena de suministro para Paneles, Trackers, Shelter, Inversores y Reconectador frente a fechas FPO.
                  </p>
                </div>

                <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[190px] print:p-2">
                  <p className="text-slate-300">
                    Fecha de Emisión: <b className="text-white">{reportDate}</b>
                  </p>
                  <p className="text-slate-300">
                    Proyectos: <b className="text-white">{reportData.projectCount}</b>
                  </p>
                  <p className="text-slate-300">
                    Alertas Críticas:{" "}
                    <b className={reportData.totalBottlenecks > 0 ? "text-rose-300" : "text-emerald-300"}>
                      {reportData.totalBottlenecks}
                    </b>
                  </p>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Proyectos Monitoreados</span>
                  <p className="text-xl font-black text-navy mt-1">{reportData.projectCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Equipos Auditados</span>
                  <p className="text-xl font-black text-slate-800 mt-1">{reportData.projectCount * 5}</p>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  reportData.totalBottlenecks > 0 ? "bg-rose-50 border-rose-300 text-rose-950" : "bg-emerald-50 border-emerald-200 text-emerald-950"
                }`}>
                  <span className="text-[10px] font-bold uppercase">Cuellos de Botella</span>
                  <p className="text-xl font-black mt-1 text-rose-700">{reportData.totalBottlenecks}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Observaciones Registradas</span>
                  <p className="text-xl font-black text-amber-950 mt-1">{reportData.totalNotesCount}</p>
                </div>
              </div>

              {/* SECTION: ALL EQUIPMENTS BY PROJECT */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-lemony" />
                    <span>Estado de Todos los Equipos por Proyecto ({filteredProjectsEquipment.length})</span>
                  </h3>

                  {reportData.allProjectsEquipment.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filtrar por proyecto..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-navy focus:bg-white transition-all w-48"
                      />
                    </div>
                  )}
                </div>

                {filteredProjectsEquipment.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    No se encontraron proyectos coincidentes.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProjectsEquipment.map((p) => {
                      const hasBottleneck = p.bottlenecks && p.bottlenecks.length > 0;
                      return (
                        <div
                          key={p.projectId}
                          className={`p-4 rounded-2xl border transition-all shadow-2xs space-y-3 print-avoid-break ${
                            hasBottleneck
                              ? "bg-amber-50/20 border-amber-200/80"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          {/* Project Top Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-navy text-white text-[11px] font-black flex items-center justify-center shrink-0">
                                {p.index}
                              </span>
                              <span className="text-sm font-black text-navy">{p.projectName}</span>
                              {p.connectionState && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Red: {p.connectionState}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {p.fpo && (
                                <span>
                                  FPO: <b className="text-navy">{formatDate(p.fpo)}</b>
                                </span>
                              )}
                              {hasBottleneck && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>{p.bottlenecks.length} alerta(s)</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 5 Equipments Status Grid for this project */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                            {p.items.map((eq) => {
                              const isDelayed = eq.status.toLowerCase().includes("retrasad");
                              const isNoPedido = eq.status.toLowerCase().includes("no pedido") || eq.status.toLowerCase().includes("pendiente oc");
                              return (
                                <div
                                  key={eq.id}
                                  className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5 flex flex-col justify-between"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-navy text-[11px]">
                                      {getEquipmentIcon(eq.id)}
                                      <span className="truncate">{eq.name}</span>
                                    </div>
                                    {(isDelayed || isNoPedido) && (
                                      <span title="Alerta en este equipo">⚠️</span>
                                    )}
                                  </div>

                                  <div>
                                    <span
                                      className={`inline-block text-[10.5px] px-2 py-0.5 rounded-md border truncate max-w-full ${getEquipmentStatusStyle(
                                        eq.status
                                      )}`}
                                    >
                                      {eq.status}
                                    </span>
                                  </div>

                                  {(eq.edt || eq.eta) && (
                                    <div className="text-[10px] text-slate-500 space-y-0.5 pt-0.5 border-t border-slate-200/50">
                                      {eq.edt && (
                                        <div className="flex justify-between">
                                          <span>EDT:</span>
                                          <b className="text-slate-700">{formatDate(eq.edt)}</b>
                                        </div>
                                      )}
                                      {eq.eta && (
                                        <div className="flex justify-between">
                                          <span>ETA:</span>
                                          <b className="text-slate-700">{formatDate(eq.eta)}</b>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {eq.notes && (
                                    <div className="pt-1.5 border-t border-amber-200/70 mt-auto">
                                      <div className="text-[10px] text-amber-950 bg-amber-100/70 p-2 rounded-lg border border-amber-300/80 shadow-2xs space-y-0.5">
                                        <div className="flex items-center gap-1 font-bold text-amber-900 text-[9px] uppercase tracking-wider">
                                          <MessageSquareText className="w-3 h-3 text-amber-700 shrink-0" />
                                          <span>Nota ({eq.name}):</span>
                                        </div>
                                        <p className="italic text-slate-800 leading-snug break-words">
                                          "{eq.notes}"
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Comentarios y Observaciones de Equipos */}
              <div className="space-y-3 pt-2 print-avoid-break">
                <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                  <MessageSquareText className="w-4 h-4 text-amber-500" />
                  <span>Resumen de Comentarios y Observaciones ({reportData.totalNotesCount})</span>
                </h3>

                {reportData.equipmentNotes.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    ℹ️ No se han registrado observaciones adicionales en los equipos de este portafolio.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportData.equipmentNotes.map((proj) => (
                      <div
                        key={proj.projectId}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5 print-avoid-break"
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
                              className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs space-y-2 shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-amber-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="p-1 rounded-md bg-white border border-amber-200">
                                    {getEquipmentIcon(n.equipmentId)}
                                  </span>
                                  <span className="font-bold text-navy text-xs">
                                    {n.equipmentName}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getEquipmentStatusStyle(n.status)}`}>
                                    {n.status}
                                  </span>
                                </div>
                                {(n.edt || n.eta) && (
                                  <span className="text-[10.5px] text-slate-500 font-medium">
                                    {n.eta ? `ETA: ${formatDate(n.eta)}` : `EDT: ${formatDate(n.edt)}`}
                                  </span>
                                )}
                              </div>
                              <div className="pl-1 text-slate-800 italic font-medium leading-relaxed">
                                💬 "{n.notes}"
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Print Footer */}
              <div className="print-footer pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span>PMO Control Tracker • Mini Informe de Equipos Principales y Suministros</span>
                </div>
                <div>
                  <span>Fecha de impresión: {new Date().toLocaleString("es-CO")}</span>
                </div>
              </div>
            </>
          ) : (
            /* Plain Text Mode for WhatsApp / Teams */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Formato preparado con todos los proyectos y equipos para copiar y pegar en WhatsApp, Teams, Slack o Correo Electrónico:
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
                rows={20}
                className="w-full font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy/20 select-all leading-relaxed resize-none shadow-inner"
              />
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <div className="p-3.5 px-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
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
    </div>,
    document.body
  );
});
