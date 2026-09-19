import React, { memo, useMemo, useState, useEffect, useRef } from "react";
import { 
  X, 
  Printer, 
  FileText, 
  AlertTriangle, 
  Zap,
  DollarSign,
  Layers,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Building2,
  Download,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  SlidersHorizontal,
  Check
} from "lucide-react";
import { toPng } from "html-to-image";
import { 
  getPortfolioMetrics, 
  formatDate, 
  getCregRegulatoryRisk,
  formatCurrencyCop,
  formatCurrencyUsd
} from "../utils/calculations";
import { getProjectBudgetMetrics, getPortfolioBudgetMetrics } from "../utils/budgetCalculations";
import { EQUIPMENT_TYPES } from "../utils/equipmentConstants";
import { getFullEquipmentMetrics, getAllPortfolioBottlenecks } from "../services/equipmentService";
import { RESTRICTION_STYLES, STATUS_STYLES } from "./CommentsView";
import { TargetProgressBar } from "./TargetProgressBar";

const formatDateTime = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
};

// =========================================================================
// MODULAR ONE-PAGER COMPONENT (FOR SINGLE PROJECT OR DOSSIER LOOP)
// =========================================================================
const ProjectOnePager = memo(function ProjectOnePager({
  project,
  reportDate,
  bottlenecks = [],
  onUpdateProject,
  isPrintAll = false,
  pageIndex = 0,
  totalPages = 1
}) {
  if (!project) return null;

  const cregRisk = useMemo(() => getCregRegulatoryRisk(project), [project]);
  const budget = useMemo(() => getProjectBudgetMetrics(project), [project]);
  const ms = project.paymentMilestones || [];
  
  const financialMetrics = useMemo(() => {
    let totalCop = 0;
    let totalUsd = 0;
    let cobradoCop = 0;
    let cobradoUsd = 0;
    let cobradoCount = 0;

    ms.forEach((m) => {
      const vCop = Number(m.valueCop) || 0;
      const vUsd = Number(m.valueUsd) || 0;
      totalCop += vCop;
      totalUsd += vUsd;
      if ((m.status || "").toLowerCase().includes("cobrad")) {
        cobradoCop += vCop;
        cobradoUsd += vUsd;
        cobradoCount++;
      }
    });

    const pctCobrado = (totalCop + totalUsd * 4000) > 0
      ? Math.round(((cobradoCop + cobradoUsd * 4000) / (totalCop + totalUsd * 4000)) * 100)
      : 100;

    return { totalCop, totalUsd, cobradoCop, cobradoUsd, cobradoCount, totalHitos: ms.length, pctCobrado };
  }, [ms]);

  const projBottlenecks = useMemo(() => {
    return (bottlenecks.find((b) => b.projectId === project.id)?.bottlenecks) || [];
  }, [bottlenecks, project.id]);

  const comments = project.comments || [];
  const unresolvedComments = comments.filter((c) => c.estado !== "Resuelto" && c.estado !== "Cerrado");

  return (
    <div className={`space-y-4 text-slate-800 ${isPrintAll && pageIndex > 0 ? "print-break-before" : ""} print:space-y-3`}>
      {/* Project Header One-Pager */}
      <div className="p-5 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-lemony text-navy">
              Ficha Técnica Ejecutiva
            </span>
            <span className="text-xs font-semibold text-nashville">
              {project.portfolioName ? `${project.portfolioName} • ` : ""}One-Pager de Proyecto
            </span>
            {isPrintAll && (
              <span className="hidden print:inline-block text-[10px] px-2 py-0.5 rounded bg-white/20 text-slate-200 font-bold ml-2">
                Página {pageIndex + 1} de {totalPages}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
            {project.name}
          </h1>
          <p className="text-xs text-slate-200 mt-0.5">
            Responsable / Gerente: <b className="text-lemony">{project.manager || "Sin asignar"}</b>
            {project.residenteCivil && (
              <span className="ml-3">Res. Civil: <b className="text-lemony">{project.residenteCivil}</b></span>
            )}
            {project.residenteElectrico && (
              <span className="ml-3">Res. Eléctrico: <b className="text-lemony">{project.residenteElectrico}</b></span>
            )}
          </p>
        </div>

        <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[180px] print:p-2">
          <p className="text-slate-300">FPO: <b className="text-white">{formatDate(project.fpo)}</b></p>
          <p className="text-slate-300">COD: <b className="text-white">{formatDate(project.cod)}</b></p>
          <p className="text-slate-300">Vencimiento CREG: <b className="text-white">{formatDate(project.creg)}</b></p>
          <p className="text-slate-300">Emisión: <b className="text-white">{reportDate}</b></p>
        </div>
      </div>

      {/* 4 Project KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:gap-2.5">
        {/* Card 1: Avance & TargetProgressBar */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Avance &amp; Desviación
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              project.gap < -5 
                ? "bg-rose-100 text-rose-700" 
                : project.gap < 0 
                ? "bg-amber-100 text-amber-800" 
                : "bg-emerald-100 text-emerald-800"
            }`}>
              GAP {project.gap > 0 ? `+${project.gap}%` : `${project.gap}%`}
            </span>
          </div>
          <div className="mt-1 space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block">REAL</span>
                <span className="text-2xl font-black text-navy leading-tight">{project.realProgress}%</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 block">PROGRAMADO</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
                  {project.scheduledProgress}%
                </span>
              </div>
            </div>
            <TargetProgressBar 
              real={project.realProgress || 0} 
              scheduled={project.scheduledProgress || 0} 
              size="sm" 
              showMarker={true} 
            />
          </div>
        </div>

        {/* Card 2: Conexión & CREG Risk */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Red &amp; Alerta CREG
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              project.connectionState === "Entregado" ? "bg-emerald-100 text-emerald-800" :
              project.connectionState === "Energizado" ? "bg-amber-100 text-amber-800" :
              project.connectionState === "DD" ? "bg-purple-100 text-purple-800" :
              project.connectionState === "Ingeniería" ? "bg-sky-100 text-sky-800" :
              "bg-slate-200 text-slate-700"
            }`}>
              {project.connectionState || "Ingeniería"}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <span className="text-xs font-bold text-slate-800 block">
              {cregRisk.riskLevel === "CRITICAL" ? "🔴 Riesgo Crítico CREG" :
               cregRisk.riskLevel === "WARNING" ? "🟡 Alerta CREG (≤60d)" :
               "🟢 CREG en Rango Normal"}
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {cregRisk.daysRemaining !== null
                ? `${cregRisk.daysRemaining} días restantes`
                : "Sin fecha CREG registrada"}
            </span>
          </div>
        </div>

        {/* Card 3: Presupuesto & EVM */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Presupuesto (BAC)
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              budget.status === "Sobrecosto" ? "bg-rose-100 text-rose-800" :
              budget.status === "En riesgo" ? "bg-amber-100 text-amber-800" :
              "bg-emerald-100 text-emerald-800"
            }`}>
              {budget.cpi !== null ? `CPI ${budget.cpi.toFixed(2)}` : "Sin Costo Real"}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-black text-slate-900 block truncate" title={budget.bac !== null ? formatCurrencyCop(budget.bac) : "—"}>
              {budget.bac !== null ? formatCurrencyCop(budget.bac) : "—"}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Costo Real (AC): {budget.ac !== null ? formatCurrencyCop(budget.ac) : "—"}
            </span>
          </div>
        </div>

        {/* Card 4: Recaudo e Hitos */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Facturación &amp; Cobro
            </span>
            <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {financialMetrics.pctCobrado}% Cobrado
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-black text-slate-900 block truncate" title={formatCurrencyCop(financialMetrics.totalCop)}>
              {formatCurrencyCop(financialMetrics.totalCop)}
            </span>
            <span className="text-[10px] text-blue-700 font-bold block mt-0.5">
              Hitos: {financialMetrics.cobradoCount} / {financialMetrics.totalHitos} cobrados
            </span>
          </div>
        </div>
      </div>

      {/* Suministro de Equipos Principales del Proyecto */}
      <div className="print-avoid-break">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Estado de Equipos Principales (5 Equipos Críticos)</span>
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">Logística &amp; Fabricación</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {EQUIPMENT_TYPES.map((eq) => {
            const item = (project.equipment || {})[eq.id] || {};
            const s = item.status || "Fabricación";
            let badge = "bg-slate-100 text-slate-700";
            if (s.includes("retrasad")) badge = "bg-rose-100 text-rose-800 font-bold";
            else if (s.includes("sitio") || s.includes("instalad")) badge = "bg-emerald-100 text-emerald-800 font-bold";
            else if (s.includes("nacional")) badge = "bg-purple-100 text-purple-800 font-bold";
            else if (s.includes("marítimo") || s.includes("maritimo")) badge = "bg-cyan-100 text-cyan-800 font-semibold";
            else if (s.includes("terrestre")) badge = "bg-amber-100 text-amber-800 font-semibold";
            else if (s.includes("fabricac")) badge = "bg-blue-100 text-blue-800";

            return (
              <div key={eq.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy text-[11px] truncate">{eq.name}</span>
                  <span className="text-[10px] font-bold text-slate-500">{item.progress || 0}%</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] block text-center truncate ${badge}`}>
                  {s}
                </span>
                <div className="space-y-0.5 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <p>ETA: <b className="text-slate-700">{formatDate(item.eta)}</b></p>
                  <p className="truncate" title={item.brand}>Marca: <b className="text-slate-700">{item.brand || "—"}</b></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hitos de Pago del Proyecto */}
      <div className="print-avoid-break">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hitos de Pago y Facturación ({(project.paymentMilestones || []).length})</span>
          </h3>
          <span className="text-[10px] text-slate-500 font-bold">
            {financialMetrics.pctCobrado}% Total Cobrado
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy text-white text-[10px] font-semibold select-none">
                <th className="p-2 border-r border-navy-light">Hito de Pago</th>
                <th className="p-2 text-right border-r border-navy-light">Valor COP</th>
                <th className="p-2 text-right border-r border-navy-light">Valor USD</th>
                <th className="p-2 text-center border-r border-navy-light w-[110px]">Estado</th>
                <th className="p-2 text-center w-[100px]">Fecha Radicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {(project.paymentMilestones || []).length > 0 ? (
                (project.paymentMilestones || []).map((m, idx) => (
                  <tr key={m.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{m.name}</td>
                    <td className="p-2 text-right font-medium text-slate-900 border-r border-slate-200 tabular-nums">
                      {formatCurrencyCop(m.valueCop)}
                    </td>
                    <td className="p-2 text-right font-medium text-blue-900 border-r border-slate-200 tabular-nums">
                      {formatCurrencyUsd(m.valueUsd)}
                    </td>
                    <td className="p-2 text-center border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (m.status || "").includes("Cobrad") ? "bg-emerald-100 text-emerald-800" :
                        (m.status || "").includes("Saldo") ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {m.status || "Por cobrar"}
                      </span>
                    </td>
                    <td className="p-2 text-center text-slate-600">
                      {formatDate(m.submittedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-400 italic">
                    Sin hitos de facturación registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Novedades y Restricciones Activas de este Proyecto */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 print-avoid-break print:p-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-navy" />
            <span>Observaciones y Restricciones de Gestión ({comments.length})</span>
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold">
            {unresolvedComments.length} activas
          </span>
        </div>

        {comments.length > 0 ? (
          <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
            {comments.slice(0, 4).map((c) => {
              const catStyle = RESTRICTION_STYLES[c.restriccion] || RESTRICTION_STYLES.General;
              const stStyle = STATUS_STYLES[c.estado] || STATUS_STYLES["En curso"];

              return (
                <div key={c.id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catStyle}`}>
                        {c.restriccion || "Suministro"}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${stStyle}`}>
                        {c.estado || "En curso"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Responsable: <b className="text-slate-800">{c.responsable || "PMO Team"}</b> • {formatDateTime(c.fecha)}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {c.comentario || c.texto}
                  </p>
                  {c.notas && (
                    <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200/60">
                      <b className="text-slate-700">Nota / Pregunta:</b> {c.notas}
                    </p>
                  )}
                  {c.respuesta && (
                    <p className="text-[10px] text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-200/60">
                      <b className="text-emerald-800">Plan de Acción / Respuesta:</b> {c.respuesta}
                    </p>
                  )}
                </div>
              );
            })}
            {comments.length > 4 && (
              <p className="text-[10px] text-slate-400 italic text-center">
                + {comments.length - 4} observaciones adicionales en el sistema.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic bg-white p-2.5 rounded-lg border border-slate-200">
            Sin observaciones ni restricciones registradas para este proyecto.
          </p>
        )}
      </div>

      {/* Conclusiones y Acuerdos Gerenciales */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 print-avoid-break print:p-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-navy">
          Conclusiones y Acuerdos del Comité Gerencial
        </h3>
        <div className="print:hidden">
          <textarea
            rows={2}
            value={project.notes || ""}
            onChange={(e) => {
              if (onUpdateProject) {
                onUpdateProject({ ...project, notes: e.target.value });
              }
            }}
            placeholder="Escribe acuerdos gerenciales, decisiones de comité o compromisos adquiridos para este proyecto..."
            className="w-full p-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed"
          />
        </div>
        <div className="hidden print:block text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
          {project.notes ? (
            <p className="italic leading-relaxed">{project.notes}</p>
          ) : (
            <p className="text-slate-400 italic">Sin acuerdos o notas adicionales registradas.</p>
          )}
        </div>
      </div>

      {/* Signatures & Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print-avoid-break">
        <div>
          <p className="font-bold text-slate-900">Oficina de Gestión de Proyectos (PMO)</p>
          <p className="text-[10px] text-slate-400">Control de Proyecto: {project.name}</p>
        </div>
        <div className="text-right">
          <div className="border-t border-slate-400 pt-1 w-52 text-center">
            <p className="font-bold text-slate-800">Dirección de Proyectos</p>
            <p className="text-[10px] text-slate-400">Visto Bueno &amp; Aprobación</p>
          </div>
        </div>
      </div>

      {/* Corporate Print Footer Watermark */}
      <div className="hidden print:flex justify-between items-center text-[9px] text-slate-400 pt-2 border-t border-slate-100">
        <span>PMO Tracker Executive System • Confidencial</span>
        <span>Generado el {reportDate}</span>
      </div>
    </div>
  );
});

// =========================================================================
// MAIN MODAL COMPONENT
// =========================================================================
export const ExecutiveReportModal = memo(function ExecutiveReportModal({
  isOpen,
  portfolio,
  isGlobal = false,
  portfolios = [],
  initialProjectId = "",
  onUpdateProject,
  onClose
}) {
  // Report Mode: "consolidated" | "individual" | "matrix"
  const [reportMode, setReportMode] = useState(initialProjectId ? "individual" : "consolidated");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [printOrientation, setPrintOrientation] = useState("portrait"); // "portrait" | "landscape"
  const [individualPrintScope, setIndividualPrintScope] = useState("selected"); // "selected" | "all"
  const [isExportingPng, setIsExportingPng] = useState(false);
  const reportContainerRef = useRef(null);

  // Modular visibility toggles for the report canvas & export
  const [visibleModules, setVisibleModules] = useState({
    kpiCards: true,
    portfolioDiagnosis: true,
    scheduleTable: true,
    signatures: true,
  });

  const toggleModule = (moduleKey) => {
    setVisibleModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  const projects = portfolio?.projects || [];

  // Update selectedProjectId when initialProjectId or portfolio changes
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
      setReportMode("individual");
      setPrintOrientation("portrait");
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [initialProjectId, projects]);

  const handleModeChange = (mode) => {
    setReportMode(mode);
    if (mode === "matrix") {
      setPrintOrientation("landscape");
    } else {
      setPrintOrientation("portrait");
    }
  };

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const metrics = useMemo(() => getPortfolioMetrics(projects), [projects]);
  const bottlenecks = useMemo(() => getAllPortfolioBottlenecks(projects), [projects]);

  const portfolioSummaries = useMemo(() => portfolios.map((item) => {
    const itemProjects = item.projects || [];
    const itemMetrics = getPortfolioMetrics(itemProjects);
    const connected = itemProjects.filter((project) => project.gridConnected || ["Energizado", "Entregado"].includes(project.connectionState)).length;
    return { id: item.id, name: item.name, total: itemProjects.length, connected, ...itemMetrics };
  }), [portfolios]);

  const reportDate = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Projects with CREG regulatory risk
  const cregRisks = useMemo(() => {
    return projects
      .map((p) => ({ project: p, risk: getCregRegulatoryRisk(p) }))
      .filter(({ risk }) => risk.riskLevel === "CRITICAL" || risk.riskLevel === "WARNING");
  }, [projects]);

  // Connection state summary
  const connectionStats = useMemo(() => {
    const montaje = projects.filter((p) => (p.connectionState || "Montaje") === "Montaje").length;
    const energizado = projects.filter((p) => p.connectionState === "Energizado").length;
    const entregado = projects.filter((p) => p.connectionState === "Entregado").length;
    const total = projects.length;
    const connectedPct = total > 0 ? Math.round(((energizado + entregado) / total) * 100) : 0;
    return { montaje, energizado, entregado, connectedPct };
  }, [projects]);

  // Financial calculations across the entire portfolio
  const financialTotals = useMemo(() => {
    let totalCop = 0;
    let totalUsd = 0;
    let cobradoCop = 0;
    let cobradoUsd = 0;
    let porCobrarCop = 0;
    let porCobrarUsd = 0;
    let totalHitos = 0;
    let hitosCobrados = 0;

    const projectFinancials = projects.map((p) => {
      const ms = p.paymentMilestones || [];
      let pCop = 0;
      let pUsd = 0;
      let pCobCop = 0;
      let pCobUsd = 0;
      let pCobCount = 0;

      ms.forEach((m) => {
        const vCop = Number(m.valueCop) || 0;
        const vUsd = Number(m.valueUsd) || 0;
        pCop += vCop;
        pUsd += vUsd;
        totalHitos++;

        if ((m.status || "").toLowerCase().includes("cobrad")) {
          pCobCop += vCop;
          pCobUsd += vUsd;
          pCobCount++;
          hitosCobrados++;
        }
      });

      totalCop += pCop;
      totalUsd += pUsd;
      cobradoCop += pCobCop;
      cobradoUsd += pCobUsd;
      porCobrarCop += (pCop - pCobCop);
      porCobrarUsd += (pUsd - pCobUsd);

      return {
        projectId: p.id,
        projectName: p.name,
        portfolioName: p.portfolioName,
        connectionState: p.connectionState || "Montaje",
        totalCop: pCop,
        totalUsd: pUsd,
        cobradoCop: pCobCop,
        cobradoUsd: pCobUsd,
        hitosCobrados: pCobCount,
        totalHitos: ms.length,
        pctCobrado: (pCop + pUsd * 4000) > 0 ? Math.round(((pCobCop + pCobUsd * 4000) / (pCop + pUsd * 4000)) * 100) : 0
      };
    });

    const globalPct = (totalCop + totalUsd * 4000) > 0 
      ? Math.round(((cobradoCop + cobradoUsd * 4000) / (totalCop + totalUsd * 4000)) * 100) 
      : 100;

    return {
      totalCop,
      totalUsd,
      cobradoCop,
      cobradoUsd,
      porCobrarCop,
      porCobrarUsd,
      totalHitos,
      hitosCobrados,
      globalPct,
      projectFinancials
    };
  }, [projects]);

  // Navigation between projects
  const handlePrevProject = () => {
    if (!projects.length) return;
    const idx = projects.findIndex((p) => p.id === selectedProjectId);
    const prevIdx = (idx - 1 + projects.length) % projects.length;
    setSelectedProjectId(projects[prevIdx].id);
  };

  const handleNextProject = () => {
    if (!projects.length) return;
    const idx = projects.findIndex((p) => p.id === selectedProjectId);
    const nextIdx = (idx + 1) % projects.length;
    setSelectedProjectId(projects[nextIdx].id);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!reportContainerRef.current) return;
    setIsExportingPng(true);
    try {
      const node = reportContainerRef.current;
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
      const safeTitle = (portfolio?.name || "Portafolio")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const modeSuffix = reportMode === "consolidated" 
        ? "Resumen_Ejecutivo" 
        : reportMode === "individual" 
        ? `Ficha_${(selectedProject?.name || "Proyecto").replace(/\s+/g, "_")}` 
        : "Matriz_Comparativa";
      link.download = `${safeTitle}_${modeSuffix}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating PNG snapshot:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  if (!isOpen || !portfolio) return null;

  return (
    <div className={`report-print-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible ${
      printOrientation === "landscape" ? "print-landscape" : "print-portrait"
    }`}>
      <div className={`report-print-content bg-white rounded-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 my-6 max-h-[94vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0 print:overflow-visible ${
        printOrientation === "landscape" ? "max-w-6xl" : "max-w-5xl"
      }`}>
        
        {/* Top Control Navigation Bar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy text-lemony flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {isGlobal ? "Reporte Ejecutivo Global" : "Centro de Informes Ejecutivos PMO"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Generador de reportes consolidados, fichas y dossiers exportables
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleModeChange("consolidated")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportMode === "consolidated"
                  ? "bg-navy text-lemony shadow-xs"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              📊 Resumen General
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("individual")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportMode === "individual"
                  ? "bg-navy text-lemony shadow-xs"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              📄 Ficha por Proyecto
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("matrix")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportMode === "matrix"
                  ? "bg-navy text-lemony shadow-xs"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              📑 Matriz Comparativa
            </button>
          </div>

          {/* Print Orientation Selector & Actions */}
          <div className="flex items-center gap-2">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs" title="Orientación de hoja para impresión / PDF">
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
              <button
                type="button"
                onClick={() => setPrintOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printOrientation === "landscape"
                    ? "bg-white text-navy shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Horizontal
              </button>
            </div>

            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-all cursor-pointer shadow-md card-hover"
              title="Descargar snapshot del informe en imagen PNG de alta resolución"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPng ? "Generando..." : "Descargar PNG"}</span>
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark transition-all cursor-pointer shadow-md card-hover"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Project Selector Bar (When in Individual Project Mode) */}
        {reportMode === "individual" && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-3 shadow-2xs print:hidden">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-navy" />
              <label className="text-xs font-bold text-slate-700">Proyecto:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-900 shadow-2xs cursor-pointer focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.portfolioName ? `(${p.portfolioName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Scope Toggle: Selected project vs Full Dossier */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setIndividualPrintScope("selected")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    individualPrintScope === "selected"
                      ? "bg-navy text-white shadow-2xs"
                      : "text-slate-600 hover:text-navy"
                  }`}
                >
                  Proyecto Activo
                </button>
                <button
                  type="button"
                  onClick={() => setIndividualPrintScope("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    individualPrintScope === "all"
                      ? "bg-navy text-white shadow-2xs"
                      : "text-slate-600 hover:text-navy"
                  }`}
                  title="Imprime todas las fichas (1 página por proyecto)"
                >
                  Dossier Completo ({projects.length} Págs)
                </button>
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={handlePrevProject}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                  title="Proyecto anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Ant</span>
                </button>
                <span className="text-xs text-slate-400 px-1 font-semibold">
                  {projects.findIndex((p) => p.id === selectedProjectId) + 1}/{projects.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextProject}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                  title="Siguiente proyecto"
                >
                  <span>Sig</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modular Report Customizer Bar (Only in Consolidated Mode) */}
        {reportMode === "consolidated" && (
          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl mb-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs print:hidden">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-navy" />
              <span className="text-xs font-bold text-slate-800">Módulos del Reporte:</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">(Activa o desactiva qué secciones exportar)</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleModule("kpiCards")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  visibleModules.kpiCards
                    ? "bg-navy text-lemony border-navy shadow-2xs"
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                }`}
              >
                {visibleModules.kpiCards && <Check className="w-3 h-3 stroke-[3]" />}
                <span>4 Tarjetas KPI</span>
              </button>

              {isGlobal ? (
                <button
                  type="button"
                  onClick={() => toggleModule("portfolioDiagnosis")}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    visibleModules.portfolioDiagnosis
                      ? "bg-navy text-lemony border-navy shadow-2xs"
                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                  }`}
                >
                  {visibleModules.portfolioDiagnosis && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>Diagnóstico Portafolios</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleModule("scheduleTable")}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    visibleModules.scheduleTable
                      ? "bg-navy text-lemony border-navy shadow-2xs"
                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                  }`}
                >
                  {visibleModules.scheduleTable && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>Cronograma y Avances</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleModule("signatures")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  visibleModules.signatures
                    ? "bg-navy text-lemony border-navy shadow-2xs"
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                }`}
              >
                {visibleModules.signatures && <Check className="w-3 h-3 stroke-[3]" />}
                <span>Firmas PMO</span>
              </button>
            </div>
          </div>
        )}

        {/* Capturable and Printable Report Container */}
        <div ref={reportContainerRef} className="report-canvas bg-white rounded-2xl">
          {/* ========================================================================= */}
          {/* MODE 1: CONSOLIDATED PORTFOLIO REPORT (4 CARDS + COMPARATIVA REAL VS PROG)*/}
          {/* ========================================================================= */}
          {reportMode === "consolidated" && (
            <div className="space-y-5 text-slate-800 print:space-y-4">
              
              {/* Header */}
              <div className="p-5 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-lemony text-navy">
                      PMO Tracker
                    </span>
                    <span className="text-xs font-semibold text-nashville">
                      Resumen Ejecutivo de Portafolio
                    </span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                    {portfolio.name}
                  </h1>
                  <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                    {portfolio.description || "Diagnóstico ejecutivo de avance real vs programado, facturación y estado de conexión."}
                  </p>
                </div>

                <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[180px] print:p-2">
                  <p className="font-bold text-white text-sm">
                    Alcance: <span className="text-lemony">{isGlobal ? "Todos los Portafolios" : portfolio.code || "PORT-01"}</span>
                  </p>
                  <p className="text-slate-300">Emisión: <b className="text-white">{reportDate}</b></p>
                  <p className="text-slate-300">Total Proyectos: <b className="text-white">{projects.length}</b></p>
                </div>
              </div>

              {/* 4 KPIs Cards */}
              {visibleModules.kpiCards && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:gap-2.5">
                {/* Card 1: Avance Real & GAP */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Avance &amp; Desviación
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      metrics.avgGap < -5 
                        ? "bg-rose-100 text-rose-700 border border-rose-200" 
                        : metrics.avgGap < 0 
                        ? "bg-amber-100 text-amber-800 border border-amber-200" 
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      GAP {metrics.avgGap > 0 ? `+${metrics.avgGap}%` : `${metrics.avgGap}%`}
                    </span>
                  </div>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Real</span>
                        <span className="text-2xl font-black text-navy leading-none">{metrics.avgReal}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Meta Prog.</span>
                        <span className="text-xs font-black text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded inline-block leading-none">
                          {metrics.avgScheduled}%
                        </span>
                      </div>
                    </div>
                    <TargetProgressBar real={metrics.avgReal} scheduled={metrics.avgScheduled} size="sm" showMarker={true} />
                  </div>
                </div>

                {/* Card 2: Recaudo & Facturación */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Recaudo &amp; Facturación
                    </span>
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {financialTotals.globalPct}% Cobrado
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-black text-slate-900 block truncate" title={formatCurrencyCop(financialTotals.totalCop)}>
                      {formatCurrencyCop(financialTotals.totalCop)}
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold block mt-1">
                      Cobrado: {formatCurrencyCop(financialTotals.cobradoCop)}
                    </span>
                  </div>
                </div>

                {/* Card 3: Estado del Cronograma */}
                <div className={`p-3.5 rounded-xl border shadow-2xs flex flex-col justify-between print:p-2.5 ${metrics.delayedCount > 0 ? "bg-amber-50/40 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Alertas Cronograma
                    </span>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                      metrics.delayedCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black ${metrics.delayedCount > 0 ? "text-amber-700" : "text-emerald-800"}`}>
                        {metrics.delayedCount}
                      </span>
                      <span className="text-xs text-slate-500">proyectos atrasados</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 truncate">
                      {metrics.delayedCount > 0 ? "Revisar plan de recuperación" : "✅ Sin atrasos relevantes"}
                    </span>
                  </div>
                </div>

                {/* Card 4: Conexión a Red */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between print:p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Conexión a Red
                    </span>
                    <div className="w-5 h-5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Zap className="w-3 h-3" />
                    </div>
                  </div>
                    <div className="mt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">
                          {connectionStats.energizado + connectionStats.entregado} / {projects.length}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">({connectionStats.connectedPct}%)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1 truncate">
                        ⚡ {connectionStats.energizado} Energizados • ✅ {connectionStats.entregado} Entregados
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Global Multi-Portfolio Health Table (Only in Global View) */}
              {isGlobal && visibleModules.portfolioDiagnosis && (
                <div className="print-avoid-break">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-navy" />
                      <span>Diagnóstico por Portafolio ({portfolioSummaries.length})</span>
                    </h3>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-navy text-white text-[11px] font-semibold select-none">
                          <th className="p-2.5 border-r border-navy-light">Portafolio</th>
                          <th className="p-2.5 text-center border-r border-navy-light w-[80px]">Proyectos</th>
                          <th className="p-2.5 text-right border-r border-navy-light w-[80px]">Real %</th>
                          <th className="p-2.5 text-right border-r border-navy-light w-[80px]">Prog %</th>
                          <th className="p-2.5 text-center border-r border-navy-light w-[80px]">GAP %</th>
                          <th className="p-2.5 text-center border-r border-navy-light w-[100px]">Conectados</th>
                          <th className="p-2.5 text-center w-[90px]">Atrasados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {portfolioSummaries.map((item, index) => (
                          <tr key={item.id} className={index % 2 ? "bg-slate-50" : "bg-white"}>
                            <td className="p-2.5 font-bold text-navy border-r border-slate-200">{item.name}</td>
                            <td className="p-2.5 text-center font-bold border-r border-slate-200">{item.total}</td>
                            <td className="p-2.5 text-right font-black text-slate-900 border-r border-slate-200">{item.avgReal}%</td>
                            <td className="p-2.5 text-right text-slate-600 border-r border-slate-200">{item.avgScheduled}%</td>
                            <td className={`p-2.5 text-center font-bold border-r border-slate-200 ${item.avgGap < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                              {item.avgGap > 0 ? `+${item.avgGap}%` : `${item.avgGap}%`}
                            </td>
                            <td className="p-2.5 text-center text-amber-800 font-bold border-r border-slate-200">{item.connected} / {item.total}</td>
                            <td className="p-2.5 text-center text-rose-700 font-bold">{item.delayedCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cronograma y Avances */}
              {!isGlobal && visibleModules.scheduleTable && (
                <div className="print-avoid-break space-y-2">
                  <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-navy" />
                    <span>Cronograma y Avances ({projects.length} Proyectos)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    FPO: Operación | COD: Comercial | CREG: Vencimiento
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-navy text-white text-[10.5px] font-bold uppercase tracking-wider select-none">
                        {isGlobal && <th className="py-2.5 px-3 border-r border-navy-light/60 w-[120px]">Portafolio</th>}
                        <th className="py-2.5 px-3 border-r border-navy-light/60">Proyecto</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[85px]">FPO</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[85px]">COD</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[85px]">Ven. CREG</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[65px]">Real %</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[65px]">Prog %</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[70px]">GAP %</th>
                        <th className="py-2.5 px-2 text-center border-r border-navy-light/60 w-[70px]">GAP Ant.</th>
                        <th className="py-2.5 px-2 text-center w-[105px]">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {projects.map((p, idx) => {
                        const curr = Number(p.gap) || 0;
                        const prev = (p.previousGap !== undefined && p.previousGap !== null && p.previousGap !== "")
                          ? Number(p.previousGap) : null;
                        const diff = prev !== null && !isNaN(prev) ? Number((curr - prev).toFixed(2)) : null;

                        return (
                          <tr key={p.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/75"} hover:bg-blue-50/40 transition-colors`}>
                            {isGlobal && (
                              <td className="py-2.5 px-3 font-bold text-navy border-r border-slate-100">
                                {p.portfolioName || "—"}
                              </td>
                            )}
                            {/* Proyecto — Nombre visible completo */}
                            <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                              {p.name}
                            </td>

                            {/* FPO / COD / CREG */}
                            <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-100 tabular-nums whitespace-nowrap font-medium">{formatDate(p.fpo) || "—"}</td>
                            <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-100 tabular-nums whitespace-nowrap font-medium">{formatDate(p.cod) || "—"}</td>
                            <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-100 tabular-nums whitespace-nowrap font-medium">{formatDate(p.creg) || "—"}</td>

                            {/* Real % */}
                            <td className="py-2.5 px-2 text-center font-bold text-slate-900 border-r border-slate-100 tabular-nums">{p.realProgress}%</td>

                            {/* Prog % */}
                            <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-100 tabular-nums font-medium">{p.scheduledProgress}%</td>

                            {/* GAP % */}
                            <td className={`py-2.5 px-2 text-center font-black border-r border-slate-100 tabular-nums ${curr < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              {curr > 0 ? `+${curr}%` : `${curr}%`}
                            </td>

                            {/* GAP Ant. */}
                            <td className={`py-2.5 px-2 text-center border-r border-slate-100 tabular-nums font-semibold ${
                              prev === null || isNaN(prev) ? "text-slate-300" :
                              prev < 0 ? "text-rose-500" : "text-emerald-600"
                            }`}>
                              {prev === null || isNaN(prev) ? "—" : prev > 0 ? `+${prev}%` : `${prev}%`}
                            </td>

                            {/* Tendencia GAP */}
                            <td className="py-2.5 px-2 text-center">
                              {diff === null ? (
                                <span className="text-slate-300 text-[10.5px]">—</span>
                              ) : diff > 0.1 ? (
                                <span className="inline-flex items-center justify-center gap-1">
                                  <span className="text-emerald-700 font-black text-[10px]">▲ Mejoró</span>
                                  <span className="text-emerald-600 text-[10px] font-bold tabular-nums">+{diff}%</span>
                                </span>
                              ) : diff < -0.1 ? (
                                <span className="inline-flex items-center justify-center gap-1">
                                  <span className="text-rose-700 font-black text-[10px]">▼ Empeoró</span>
                                  <span className="text-rose-600 text-[10px] font-bold tabular-nums">{diff}%</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-semibold">= Igual</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

              {/* Signatures */}
              {visibleModules.signatures && (
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print-avoid-break">
                  <div>
                    <p className="font-bold text-slate-900">Oficina de Gestión de Proyectos (PMO)</p>
                    <p className="text-[10px] text-slate-400">Sistema de Control y Seguimiento PMO</p>
                  </div>
                  <div className="text-right">
                    <div className="border-t border-slate-400 pt-1 w-52 text-center">
                      <p className="font-bold text-slate-800">Dirección de Proyectos</p>
                      <p className="text-[10px] text-slate-400">Visto Bueno Gerencial</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Corporate Print Footer Watermark */}
              <div className="flex justify-between items-center text-[9px] text-slate-400 pt-2 border-t border-slate-100">
                <span>PMO Tracker Executive System • Confidencial</span>
                <span>Generado el {reportDate}</span>
              </div>

            </div>
          )}

        {/* ========================================================================= */}
        {/* MODE 2: INDIVIDUAL PROJECT EXECUTIVE ONE-PAGER / DOSSIER                  */}
        {/* ========================================================================= */}
        {reportMode === "individual" && selectedProject && (
          <div>
            {/* When dossier mode is active, print all projects; on screen show active project */}
            {individualPrintScope === "all" ? (
              <>
                {/* Screen view with helper message */}
                <div className="print:hidden space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                    <span className="font-bold">📄 Modo Dossier Activo:</span>
                    <span>
                      Al hacer clic en <i>Imprimir / PDF</i> se generará un dossier continuo con 1 página por proyecto ({projects.length} páginas en total). Navega abajo para previsualizar cada una.
                    </span>
                  </div>
                  <ProjectOnePager
                    project={selectedProject}
                    reportDate={reportDate}
                    bottlenecks={bottlenecks}
                    onUpdateProject={onUpdateProject}
                    isPrintAll={false}
                  />
                </div>

                {/* Print view rendering all projects */}
                <div className="hidden print:block">
                  {projects.map((proj, idx) => (
                    <ProjectOnePager
                      key={proj.id}
                      project={proj}
                      reportDate={reportDate}
                      bottlenecks={bottlenecks}
                      onUpdateProject={onUpdateProject}
                      isPrintAll={true}
                      pageIndex={idx}
                      totalPages={projects.length}
                    />
                  ))}
                </div>
              </>
            ) : (
              <ProjectOnePager
                project={selectedProject}
                reportDate={reportDate}
                bottlenecks={bottlenecks}
                onUpdateProject={onUpdateProject}
                isPrintAll={false}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: COMPARATIVE MATRIX TABLE                                          */}
        {/* ========================================================================= */}
        {reportMode === "matrix" && (
          <div className="space-y-6 text-slate-800 print:space-y-4">
            {/* Header */}
            <div className="p-6 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-lemony text-navy">
                  Matriz Comparativa
                </span>
                <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                  Diagnóstico Integral de Proyectos
                </h1>
                <p className="text-xs text-slate-200 mt-1">
                  Comparativa de semáforos, avance real, conexión a red, recaudo y restricciones activas.
                </p>
              </div>
              <div className="text-right text-xs bg-white/10 p-3 rounded-xl border border-white/10 print:p-2">
                <p className="text-slate-300">Emisión: <b className="text-white">{reportDate}</b></p>
                <p className="text-slate-300">Total Proyectos: <b className="text-white">{projects.length}</b></p>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs print-avoid-break">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-navy text-white text-[11px] font-semibold select-none">
                    <th className="p-2.5 border-r border-navy-light">Proyecto</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[80px]">Real %</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[80px]">GAP %</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[90px]">Cronograma</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[90px]">Red</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[90px]">CREG</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[90px]">% Cobrado</th>
                    <th className="p-2.5 text-center border-r border-navy-light w-[85px]">Cuellos Botella</th>
                    <th className="p-2.5 text-center w-[85px]">Restricciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {projects.map((p, idx) => {
                    const cRisk = getCregRegulatoryRisk(p);
                    const bCount = (bottlenecks.find((b) => b.projectId === p.id)?.bottlenecks || []).length;
                    const cCount = (p.comments || []).filter((c) => c.estado !== "Resuelto" && c.estado !== "Cerrado").length;
                    const pf = financialTotals.projectFinancials.find((f) => f.projectId === p.id);

                    return (
                      <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-2.5 font-bold text-navy border-r border-slate-200">{p.name}</td>
                        <td className="p-2.5 text-center font-black text-slate-900 border-r border-slate-200">{p.realProgress}%</td>
                        <td className={`p-2.5 text-center font-bold border-r border-slate-200 ${p.gap < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                          {p.gap > 0 ? `+${p.gap}%` : `${p.gap}%`}
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (p.status || "").includes("atrasad") ? "bg-rose-100 text-rose-700" :
                            (p.status || "").includes("riesgo") ? "bg-amber-100 text-amber-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {p.status || "En tiempo"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.connectionState === "Entregado" ? "bg-emerald-100 text-emerald-800" :
                            p.connectionState === "Energizado" ? "bg-amber-100 text-amber-800" :
                            p.connectionState === "DD" ? "bg-purple-100 text-purple-800" :
                            p.connectionState === "Ingeniería" ? "bg-sky-100 text-sky-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {p.connectionState || "Ingeniería"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cRisk.riskLevel === "CRITICAL" ? "bg-rose-100 text-rose-800" :
                            cRisk.riskLevel === "WARNING" ? "bg-amber-100 text-amber-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {cRisk.daysRemaining !== null ? `${cRisk.daysRemaining}d` : "—"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200 font-bold text-blue-700">
                          {pf?.pctCobrado || 0}%
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bCount > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {bCount > 0 ? `${bCount} alerta(s)` : "0"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cCount > 0 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"
                          }`}>
                            {cCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print-avoid-break">
              <div>
                <p className="font-bold text-slate-900">Oficina de Gestión de Proyectos (PMO)</p>
                <p className="text-[10px] text-slate-400">Matriz de Diagnóstico y Control</p>
              </div>
              <div className="text-right">
                <div className="border-t border-slate-400 pt-1 w-52 text-center">
                  <p className="font-bold text-slate-800">Dirección de Proyectos</p>
                  <p className="text-[10px] text-slate-400">Visto Bueno Gerencial</p>
                </div>
              </div>
            </div>

            {/* Corporate Print Footer Watermark */}
            <div className="hidden print:flex justify-between items-center text-[9px] text-slate-400 pt-2 border-t border-slate-100">
              <span>PMO Tracker Executive System • Confidencial</span>
              <span>Generado el {reportDate}</span>
            </div>

          </div>
        )}

        </div>
      </div>
    </div>
  );
});
