import React, { memo, useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  AlertCircle,
  Clock3,
  HelpCircle,
  CheckCircle2
} from "lucide-react";
import { toPng } from "html-to-image";
import { formatDate } from "../utils/calculations";
import {
  RESTRICTION_CATEGORIES,
  isCommentCompleted
} from "../models/projectModel";
import { RESTRICTION_STYLES, STATUS_STYLES } from "../constants/commentStyles";

export const CommentsReportModal = memo(function CommentsReportModal({
  isOpen,
  onClose,
  projects = [],
  portfolioName = "",
  selectedProjectId: initialProjectId = ""
}) {
  const [printOrientation, setPrintOrientation] = useState("landscape");
  const [filterProjectId, setFilterProjectId] = useState(() => initialProjectId || "all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("activas"); // "activas" | "all" | "completadas"
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

  // Flatten all comments with project metadata
  const allComments = useMemo(() => {
    const list = [];
    projects.forEach((proj) => {
      const comments = proj.comments || [];
      comments.forEach((c) => {
        list.push({
          ...c,
          projectId: proj.id,
          projectName: proj.name,
          projectManager: proj.manager || "Sin asignar",
          realProgress: proj.realProgress || 0,
          scheduledProgress: proj.scheduledProgress || 0,
          fpo: proj.fpo,
          isCompleted: isCommentCompleted(c)
        });
      });
    });
    return list;
  }, [projects]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return allComments.filter((item) => {
      if (filterProjectId !== "all" && item.projectId !== filterProjectId) return false;
      if (filterCategory !== "all" && (item.restriccion || "Suministro") !== filterCategory) return false;
      if (filterStatus === "activas" && item.isCompleted) return false;
      if (filterStatus === "completadas" && !item.isCompleted) return false;
      return true;
    });
  }, [allComments, filterProjectId, filterCategory, filterStatus]);

  // Summary statistics
  const stats = useMemo(() => {
    let activas = 0;
    let completadas = 0;
    let enRevision = 0;
    let pendiente = 0;
    let enCurso = 0;

    allComments.forEach((c) => {
      if (c.isCompleted) {
        completadas++;
      } else {
        activas++;
        const st = (c.estado || "").toLowerCase();
        if (st.includes("revis")) enRevision++;
        else if (st.includes("pendient")) pendiente++;
        else enCurso++;
      }
    });

    return {
      total: allComments.length,
      activas,
      completadas,
      enRevision,
      pendiente,
      enCurso
    };
  }, [allComments]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    RESTRICTION_CATEGORIES.forEach((cat) => {
      counts[cat] = 0;
    });
    allComments.forEach((c) => {
      if (!c.isCompleted) {
        const cat = c.restriccion || "Suministro";
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [allComments]);

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
      link.download = `Mini_Informe_Observaciones_${safeTitle}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG de observaciones:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopySummary = () => {
    let text = `📝 *INFORME EJECUTIVO DE NOVEDADES Y OBSERVACIONES*\n`;
    text += `Portafolio: ${portfolioName || "General"}\n`;
    text += `Fecha de corte: ${reportDate}\n`;
    text += `Novedades Activas: ${stats.activas} | Resueltas: ${stats.completadas}\n`;
    text += `──────────────────────────────────────\n\n`;

    filteredComments.forEach((item, idx) => {
      text += `${idx + 1}. [${item.restriccion || "General"}] — ${item.projectName}\n`;
      text += `   • Estado: ${item.estado || "En curso"} | Responsable: ${item.responsable || "PMO"}\n`;
      text += `   • Observación: ${item.comentario || item.texto || "—"}\n`;
      if (item.notas) text += `   • Seguimiento: ${item.notas}\n`;
      if (item.respuesta) text += `   • Plan de acción: ${item.respuesta}\n`;
      text += `\n`;
    });

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
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy text-lemony flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy leading-tight">
                Mini Informe Ejecutivo de Observaciones y Novedades (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {portfolioName ? `Portafolio: ${portfolioName} • ` : ""}
                Bitácora de restricciones, compromisos y planes de mitigación
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filters */}
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las restricciones</option>
              {RESTRICTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none cursor-pointer"
            >
              <option value="activas">Solo Activas ({stats.activas})</option>
              <option value="all">Todas ({stats.total})</option>
              <option value="completadas">Solo Resueltas ({stats.completadas})</option>
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
                  Bitácora de Observaciones y Novedades de Gestión
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                {portfolioName || "Portafolio de Proyectos Solares"}
              </h1>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                Seguimiento formal de novedades de campo, restricciones operativas, licenciamiento, ingeniería, suministros y planes de mitigación.
              </p>
            </div>

            <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[190px] print:p-2">
              <p className="text-slate-300">
                Fecha de Emisión: <b className="text-white">{reportDate}</b>
              </p>
              <p className="text-slate-300">
                Novedades en Informe: <b className="text-white">{filteredComments.length}</b>
              </p>
              <p className="text-slate-300">
                Filtro Aplicado:{" "}
                <b className="text-lemony">
                  {filterStatus === "activas" ? "Novedades Activas" : filterStatus === "completadas" ? "Resueltas" : "Consolidado Completo"}
                </b>
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Activas</span>
                <Clock3 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-950 mt-1">{stats.activas}</p>
              <span className="text-[10px] text-emerald-700 mt-0.5">En proceso de atención</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">En Revisión</span>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-950 mt-1">{stats.enRevision}</p>
              <span className="text-[10px] text-amber-700 mt-0.5">Pendiente validación</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Pendientes</span>
                <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-950 mt-1">{stats.pendiente}</p>
              <span className="text-[10px] text-rose-700 mt-0.5">Sin inicio de acción</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Completadas</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.completadas}</p>
              <span className="text-[10px] text-slate-500 mt-0.5">Cerradas satisfactoriamente</span>
            </div>
          </div>

          {/* Active Restrictions Category Badges */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2 print-avoid-break">
            <span className="text-[11px] font-black uppercase text-navy mr-2">
              Distribución por Restricción:
            </span>
            {RESTRICTION_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                    count > 0 ? RESTRICTION_STYLES[cat] || "bg-slate-100 text-slate-700 border-slate-200" : "bg-white text-slate-400 border-slate-200 opacity-60"
                  }`}
                >
                  <span>{cat}</span>
                  <b className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">{count}</b>
                </span>
              );
            })}
          </div>

          {/* Detailed Observations Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden print-avoid-break">
            <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-navy" />
                <h3 className="text-xs font-black text-navy uppercase tracking-wider">
                  Listado Detallado de Novedades ({filteredComments.length} Registros)
                </h3>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase">
                  <th className="py-2.5 px-3">Proyecto</th>
                  <th className="py-2.5 px-3 text-center">Restricción</th>
                  <th className="py-2.5 px-3">Observación / Novedad</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Fecha</th>
                  <th className="py-2.5 px-3">Plan de Acción / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No se encontraron observaciones que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredComments.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-black text-navy align-top">
                        {item.projectName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.projectManager}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            RESTRICTION_STYLES[item.restriccion] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.restriccion || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 text-[11px] font-medium leading-snug align-top max-w-sm">
                        {item.comentario || item.texto || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-bold align-top whitespace-nowrap">
                        {item.responsable || item.autor || "PMO"}
                      </td>
                      <td className="py-2.5 px-3 text-center align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            STATUS_STYLES[item.estado] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.estado || "En curso"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-semibold align-top whitespace-nowrap text-[11px]">
                        {formatDate(item.fecha ? item.fecha.slice(0, 10) : "")}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] leading-snug align-top max-w-xs space-y-1">
                        {item.notas && (
                          <p className="text-slate-700 italic">
                            <b>Nota:</b> {item.notas}
                          </p>
                        )}
                        {item.respuesta && (
                          <p className="text-emerald-800 font-medium">
                            <b>Acción:</b> {item.respuesta}
                          </p>
                        )}
                        {!item.notas && !item.respuesta && (
                          <span className="text-slate-300 italic">Sin plan registrado</span>
                        )}
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
              <span>PMO Control Tracker • Mini Informe de Observaciones y Novedades</span>
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
