import React, { memo, useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
  Layers,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Clock,
  Sliders,
  ChevronRight,
  Info,
  Target,
  Activity,
  RotateCcw,
  Zap,
  CheckCircle2,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ScatterChart,
  Scatter,
  Cell,
  ZAxis,
  Legend
} from "recharts";
import { formatCurrencyCop, formatDate } from "../utils/calculations";
import { runPortfolioMonteCarlo, simulateSingleProject } from "../utils/monteCarloService";

const money = (val) => (val === null || val === undefined ? "—" : formatCurrencyCop(val));
const moneyM = (val) => (val === null || val === undefined ? "—" : `$${(val / 1e6).toFixed(1)}M`);
const dateStr = (ms) => (ms ? formatDate(new Date(ms).toISOString().slice(0, 10)) : "—");

export const MonteCarloModal = memo(function MonteCarloModal({
  isOpen,
  onClose,
  projects = [],
  portfolioName = ""
}) {
  const [activeTab, setActiveTab] = useState("schedule"); // "schedule" | "cost" | "bivariate" | "tornado" | "whatif" | "matrix"
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [iterations, setIterations] = useState(2500);
  const [stressLevel, setStressLevel] = useState("moderate"); // "optimistic" | "moderate" | "pessimistic"
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSeed, setSimSeed] = useState(0);

  // Advanced Visualizations & What-If States
  const [showOverlayScenario, setShowOverlayScenario] = useState(false);
  const [tornadoMetric, setTornadoMetric] = useState("schedule"); // "schedule" | "cost"
  const [whatIf, setWhatIf] = useState({
    equipmentOffsetDays: 0,
    trmOffsetPct: 0,
    epcAccelerationPct: 0,
    regulatoryOffsetDays: 0
  });

  const hasWhatIfActive = useMemo(() => {
    return whatIf.equipmentOffsetDays !== 0 ||
      whatIf.trmOffsetPct !== 0 ||
      whatIf.epcAccelerationPct !== 0 ||
      whatIf.regulatoryOffsetDays !== 0;
  }, [whatIf]);

  const handleResetWhatIf = () => {
    setWhatIf({
      equipmentOffsetDays: 0,
      trmOffsetPct: 0,
      epcAccelerationPct: 0,
      regulatoryOffsetDays: 0
    });
  };

  // Manage body classes for clean print isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open-printing", "print-landscape");
      return () => {
        document.body.classList.remove("modal-open-printing", "print-landscape");
      };
    }
  }, [isOpen]);

  // Selected project object if individual
  const selectedProject = useMemo(() => {
    if (selectedProjectId === "all") return null;
    return projects.find((p) => String(p.id) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  // Baseline Simulation (Without What-If adjustments, to calculate real-time Deltas)
  const baseSimulationData = useMemo(() => {
    if (!isOpen || !projects.length) return null;
    if (selectedProject) {
      return simulateSingleProject(selectedProject, iterations, { stressLevel });
    }
    return runPortfolioMonteCarlo(projects, iterations, { stressLevel });
  }, [isOpen, projects, selectedProject, iterations, stressLevel, simSeed]);

  // Active Simulation (With What-If applied)
  const simulationData = useMemo(() => {
    if (!isOpen || !projects.length) return null;

    const portfolioRes = runPortfolioMonteCarlo(projects, iterations, { stressLevel, whatIf });

    if (selectedProject) {
      const singleRes = simulateSingleProject(selectedProject, iterations, { stressLevel, whatIf });
      return {
        isSingle: true,
        project: selectedProject,
        projectResults: portfolioRes.projectResults,
        ...singleRes
      };
    }

    return {
      isSingle: false,
      ...portfolioRes
    };
  }, [isOpen, projects, selectedProject, iterations, stressLevel, whatIf, simSeed]);

  const handleRecalculate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimSeed((prev) => prev + 1);
      setIsSimulating(false);
    }, 150);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!simulationData) return;
    let text = `🎲 *SIMULACIÓN MONTE CARLO PMO — ${portfolioName || "PORTAFOLIO"}*\n`;
    text += `Fecha: ${new Date().toLocaleDateString("es-CO")}\n`;
    text += `Iteraciones: ${iterations.toLocaleString()} | Escenario: ${stressLevel.toUpperCase()}\n`;
    text += `──────────────────────────────────────\n`;

    if (simulationData.isSingle) {
      text += `📌 *Proyecto:* ${simulationData.projectName}\n`;
      text += `• Probabilidad Éxito CREG: ${simulationData.probCregSuccess !== null ? `${simulationData.probCregSuccess}%` : "N/A"}\n`;
      text += `• Fecha P50 (Mediana): ${dateStr(simulationData.p50Date)}\n`;
      text += `• Fecha P80 (Compromiso PMO): ${dateStr(simulationData.p80Date)}\n`;
      text += `• Costo P50: ${money(simulationData.p50Cost)}\n`;
      text += `• Costo P80: ${money(simulationData.p80Cost)}\n`;
      text += `• Reserva Contingencia Sugerida: ${money(simulationData.costContingencyCopP80)}\n`;
    } else {
      text += `• Proyectos Simulados: ${simulationData.totalProjects}\n`;
      text += `• Probabilidad Portafolio CREG: ${simulationData.probPortfolioCregSuccess}%\n`;
      text += `• Fecha Fin Portafolio P50: ${dateStr(simulationData.portfolioP50Date)}\n`;
      text += `• Fecha Fin Portafolio P80: ${dateStr(simulationData.portfolioP80Date)}\n`;
      text += `• Presupuesto Base (BAC): ${money(simulationData.portfolioBac)}\n`;
      text += `• Costo P50 Proyectado: ${money(simulationData.p50Cost)}\n`;
      text += `• Costo P80 (Nivel Confianza 80%): ${money(simulationData.p80Cost)}\n`;
      text += `• Contingencia Financiera P80: ${money(simulationData.financialContingencyP80)}\n`;
      text += `• Probabilidad Dentro de Presupuesto: ${simulationData.probPortfolioBudgetSuccess}%\n`;
    }

    text += `──────────────────────────────────────\n`;
    text += `_Generado automáticamente por PMO Control Tracker_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="report-print-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="report-print-content bg-white rounded-3xl w-full max-w-7xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-4 max-h-[96vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none print:p-0 print:my-0 print:overflow-visible">
        
        {/* ============================================================== */}
        {/* Top Control Navigation Bar (Hidden in Print)                   */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-navy text-lemony flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-lemony" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-navy leading-tight">
                  Simulación de Riesgo Monte Carlo
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-lemony text-navy border border-lemony/50">
                  Estocástico
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {portfolioName ? `${portfolioName} • ` : ""}
                Modelado probabilístico de plazos regulatorios (CREG/COD), costos (EAC) y contingencias
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Recalculate Button */}
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200 active:scale-95 disabled:opacity-50"
              title="Correr un nuevo ciclo de simulaciones aleatorias"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin text-navy" : "text-slate-500"}`} />
              <span>{isSimulating ? "Simulando..." : "Recalcular"}</span>
            </button>

            {/* Copy Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200"
              title="Copiar resumen estructurado"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>

            {/* Print / PDF Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark transition-all cursor-pointer shadow-xs"
              title="Imprimir o exportar en PDF"
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
        {/* Simulation Controls Toolbar (Scope, Mode, Stress, Iterations)  */}
        {/* ============================================================== */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl mb-5 space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Scope: Portfolio or Specific Project */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-navy flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Alcance:</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 focus:border-navy focus:ring-2 focus:ring-navy/20 rounded-xl text-xs font-bold text-navy shadow-2xs cursor-pointer focus:outline-none"
              >
                <option value="all">🌐 Portafolio Consolidado ({projects.length} proyectos)</option>
                <optgroup label="Proyectos individuales">
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center bg-slate-200/70 p-1 rounded-xl text-xs border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "schedule" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Plazos &amp; CREG</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("cost")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "cost" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Costos &amp; Margen</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bivariate")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "bivariate" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Plazo vs. Costo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tornado")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "tornado" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Sensibilidad (Tornado)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("whatif")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer relative ${
                  activeTab === "whatif" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulador What-If</span>
                {hasWhatIfActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Palancas What-If activas" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "matrix" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Matriz Comparativa</span>
              </button>
            </div>

            {/* Simulation Parameters: Stress Level & Iterations */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Escenario:</span>
                <select
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="optimistic">🟢 Optimista (±10%)</option>
                  <option value="moderate">🟡 Moderado / PERT (±18%)</option>
                  <option value="pessimistic">🔴 Estresado (±30%)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Iteraciones:</span>
                <select
                  value={iterations}
                  onChange={(e) => setIterations(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value={1000}>1,000 runs</option>
                  <option value={2500}>2,500 runs</option>
                  <option value={5000}>5,000 runs</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* Printable Simulation Canvas                                    */}
        {/* ============================================================== */}
        {simulationData && (
          <div className="space-y-5 text-slate-800">
            {/* Header Banner */}
            <div className="p-5 rounded-2xl bg-navy text-white flex flex-wrap items-start justify-between gap-4 shadow-sm print:p-4 print:rounded-xl">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-lemony text-navy">
                    PMO TRACKER • SIMULACIÓN ESTOCÁSTICA
                  </span>
                  <span className="text-xs font-semibold text-nashville">
                    {simulationData.isSingle ? `Proyecto: ${simulationData.projectName}` : `Portafolio: ${portfolioName || "General"}`}
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white mt-1 print:text-xl">
                  {simulationData.isSingle ? simulationData.projectName : "Evaluación de Riesgo Monte Carlo"}
                </h1>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  {simulationData.isSingle
                    ? `Análisis de variabilidad con distribución Beta-PERT y simulación de ${iterations.toLocaleString()} escenarios estocásticos de avance y costos.`
                    : `Evaluación integral combinada sobre ${simulationData.totalProjects} proyectos mediante ${iterations.toLocaleString()} iteraciones simultáneas de plazos y contingencia presupuestal.`}
                </p>
              </div>

              <div className="text-right text-xs space-y-1 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[190px] print:p-2">
                <p className="text-slate-300">
                  Muestra: <b className="text-white">{iterations.toLocaleString()} iteraciones</b>
                </p>
                <p className="text-slate-300">
                  Escenario de Incertidumbre: <b className="text-lemony">{stressLevel.toUpperCase()}</b>
                </p>
                <p className="text-slate-300">
                  Emisión: <b className="text-white">{new Date().toLocaleDateString("es-CO")}</b>
                </p>
              </div>
            </div>

            {/* ========================================================== */}
            {/* TAB 1: PLAZOS & CREG SCHEDULE RISK                         */}
            {/* ========================================================== */}
            {activeTab === "schedule" && (
              <div className="space-y-5">
                {/* 4 Schedule KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Card 1: Probabilidad de Cumplimiento CREG */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Probabilidad Éxito CREG
                      </span>
                      {(() => {
                        const prob = simulationData.isSingle ? simulationData.probCregSuccess : simulationData.probPortfolioCregSuccess;
                        if (prob === null) return <Clock className="w-4 h-4 text-slate-400" />;
                        return prob >= 80 ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                        );
                      })()}
                    </div>
                    <div className="mt-2">
                      <p className="text-3xl font-black text-navy">
                        {simulationData.isSingle
                          ? (simulationData.probCregSuccess !== null ? `${simulationData.probCregSuccess}%` : "Sin CREG")
                          : `${simulationData.probPortfolioCregSuccess}%`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {(() => {
                          if (simulationData.isSingle && simulationData.isCompleted) {
                            return "⚡ Proyecto Energizado — Riesgo CREG Extinguido";
                          }
                          const prob = simulationData.isSingle ? simulationData.probCregSuccess : simulationData.probPortfolioCregSuccess;
                          if (prob === null) return "Sin fecha regulatoria CREG registrada";
                          if (prob >= 80) return "✅ Alta certidumbre de cumplimiento";
                          if (prob >= 50) return "⚠️ Riesgo moderado de vencimiento";
                          return "🔴 Alto riesgo de sanción CREG";
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Fecha P50 (Mediana) */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Fecha P50 (Más Probable)
                    </span>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-slate-900">
                        {simulationData.isSingle ? dateStr(simulationData.p50Date) : dateStr(simulationData.portfolioP50Date)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        50% de las simulaciones culminan antes de esta fecha
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Fecha P80 (Nivel de Compromiso PMO) */}
                  <div className="p-4 rounded-2xl border-2 border-navy/30 bg-navy/5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-navy uppercase tracking-wider">
                        Fecha P80 (Compromiso PMO)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy text-lemony font-black">
                        Recomendado
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-navy">
                        {simulationData.isSingle ? dateStr(simulationData.p80Date) : dateStr(simulationData.portfolioP80Date)}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        80% de nivel de confianza para compromisos contractuales
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Fecha P90 (Escenario Pesimista) */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Fecha P90 (Pesimista)
                    </span>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-slate-900">
                        {simulationData.isSingle ? dateStr(simulationData.p90Date) : dateStr(simulationData.portfolioP90Date)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Escenario con estrés logístico y restricciones severas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Single Project Context Badge for Schedule */}
                {simulationData.isSingle && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Avance Real vs Prog.</span>
                        <span className="font-black text-navy">{simulationData.realProgress}% <span className="text-[10px] text-slate-500 font-normal">/ {simulationData.scheduledProgress}%</span></span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Fecha COD Contractual</span>
                        <span className="font-bold text-slate-700">{dateStr(simulationData.codDate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Límite Regulatorio CREG</span>
                        <span className="font-bold text-rose-700">{dateStr(simulationData.cregDate)}</span>
                      </div>
                      {simulationData.timeContingencyDaysP80 > 0 && (
                        <div>
                          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Desvío P80 vs COD</span>
                          <span className="font-bold text-amber-800">+{simulationData.timeContingencyDaysP80} días</span>
                        </div>
                      )}
                    </div>
                    {simulationData.isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ⚡ Proyecto Energizado / 100%
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Simulado con variabilidad estocástica Beta-PERT
                      </span>
                    )}
                  </div>
                )}

                {/* S-Curve & Histogram Chart Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Cumulative S-Curve (CDF) */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-navy" />
                        <span>Curva S de Probabilidad Acumulada de Plazos (CDF)</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowOverlayScenario(!showOverlayScenario)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border cursor-pointer ${
                            showOverlayScenario
                              ? "bg-navy text-lemony border-navy"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                          }`}
                          title="Comparar Curva S del Escenario Optimista, Moderado y Estresado"
                        >
                          {showOverlayScenario ? "📈 Ocultar Abanico" : "📈 Abanico Multiescenario"}
                        </button>
                        <span className="text-[10px] text-slate-500 font-semibold">0% a 100%</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {showOverlayScenario
                        ? "Abanico de incertidumbre comparando el escenario Optimista (verde), Moderado (azul) y Estresado (rojo)."
                        : "Muestra la probabilidad acumulada de energizar el proyecto o portafolio en o antes de cada fecha."}
                    </p>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        {showOverlayScenario && simulationData.multiScenarioDateCurve ? (
                          <AreaChart data={simulationData.multiScenarioDateCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="modLabel" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-navy text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-700 space-y-1">
                                      <p className="font-bold text-lemony">Nivel de Confianza: {d.percentile}%</p>
                                      <p className="text-[11px] text-emerald-400">🟢 Optimista: <b>{d.optLabel}</b></p>
                                      <p className="text-[11px] text-sky-300">🔵 Moderado (PERT): <b>{d.modLabel}</b></p>
                                      <p className="text-[11px] text-rose-400">🔴 Estresado: <b>{d.pessLabel}</b></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "P50", fill: "#f59e0b", fontSize: 10 }} />
                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "P80", fill: "#10b981", fontSize: 10 }} />
                            <Area type="monotone" dataKey="percentile" stroke="#10b981" strokeWidth={1.8} strokeDasharray="3 3" fill="none" name="Optimista" />
                            <Area type="monotone" dataKey="percentile" stroke="#132644" strokeWidth={2.8} fillOpacity={0.15} fill="#132644" name="Moderado" />
                            <Area type="monotone" dataKey="percentile" stroke="#ef4444" strokeWidth={1.8} strokeDasharray="3 3" fill="none" name="Estresado" />
                          </AreaChart>
                        ) : (
                          <AreaChart data={simulationData.dateCumulativeCurve || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#132644" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8cc3e1" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-navy text-white text-xs p-2 rounded-xl shadow-lg border border-slate-700 space-y-0.5">
                                      <p className="font-bold text-lemony">{data.label}</p>
                                      <p>Probabilidad acumulada: <b>{data.percentile.toFixed(0)}%</b></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "P50", fill: "#f59e0b", fontSize: 10 }} />
                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "P80", fill: "#10b981", fontSize: 10 }} />
                            <Area type="monotone" dataKey="percentile" stroke="#132644" strokeWidth={2.5} fillOpacity={1} fill="url(#probGradient)" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Histogram of Completion Dates */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-navy" />
                        <span>Densidad de Frecuencia de Culminación (Histograma)</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold">{iterations.toLocaleString()} iteraciones</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Distribución de frecuencias de fechas finales simuladas.
                    </p>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={simulationData.dateHistogram || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                          <YAxis tick={{ fontSize: 10 }} unit="%" />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-navy text-white text-xs p-2 rounded-xl shadow-lg border border-slate-700 space-y-0.5">
                                    <p className="font-bold text-lemony">{data.label}</p>
                                    <p>Frecuencia: <b>{data.frequency}%</b> ({data.count} runs)</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="frequency" fill="#8cc3e1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 2: COSTOS & EAC / MARGEN                               */}
            {/* ========================================================== */}
            {activeTab === "cost" && (
              <div className="space-y-5">
                {/* 4 Cost KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Card 1: Probabilidad Dentro de Presupuesto */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Prob. Cumplir BAC
                    </span>
                    <div className="mt-2">
                      <p className="text-3xl font-black text-navy">
                        {simulationData.isSingle ? `${simulationData.probBudgetSuccess}%` : `${simulationData.probPortfolioBudgetSuccess}%`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Probabilidad de culminar con costo final ≤ Presupuesto Base
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Costo P50 */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Costo P50 (Más Probable)
                    </span>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-slate-900 truncate" title={money(simulationData.p50Cost)}>
                        {money(simulationData.p50Cost)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Presupuesto Base (BAC): {money(simulationData.isSingle ? simulationData.bac : simulationData.portfolioBac)}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Costo P80 */}
                  <div className="p-4 rounded-2xl border-2 border-navy/30 bg-navy/5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-navy uppercase tracking-wider">
                        Costo P80 (Nivel Confianza 80%)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy text-lemony font-black">
                        Compromiso
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-navy truncate" title={money(simulationData.p80Cost)}>
                        {money(simulationData.p80Cost)}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Costo máximo con 80% de certeza estadística
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Reserva de Contingencia Financiera Sugerida */}
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 flex flex-col justify-between shadow-2xs">
                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">
                      Reserva de Contingencia Sugerida
                    </span>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-amber-900 truncate" title={money(simulationData.isSingle ? simulationData.costContingencyCopP80 : simulationData.financialContingencyP80)}>
                        {money(simulationData.isSingle ? simulationData.costContingencyCopP80 : simulationData.financialContingencyP80)}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Fondo recomendado sobre el BAC para cubrir riesgo P80
                      </p>
                    </div>
                  </div>
                </div>

                {/* Single Project Context Badge for Cost */}
                {simulationData.isSingle && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Presupuesto Base (BAC)</span>
                        <span className="font-black text-navy">{money(simulationData.bac)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Costo Actual (AC)</span>
                        <span className="font-bold text-slate-700">{money(simulationData.ac)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">CAPEX Venta</span>
                        <span className="font-bold text-slate-700">{money(simulationData.capexVenta)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Margen P50 Proyectado</span>
                        <span className={`font-black ${simulationData.p50Margin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {money(simulationData.p50Margin)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block text-right">Reserva P80 Recomendada</span>
                      <span className="font-black text-amber-900 block text-right">{money(simulationData.costContingencyCopP80)}</span>
                    </div>
                  </div>
                )}

                {/* S-Curve & Histogram Chart Section for Cost */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Cumulative S-Curve for Cost */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-navy" />
                        <span>Curva S de Probabilidad de Costo Final (CDF)</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowOverlayScenario(!showOverlayScenario)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border cursor-pointer ${
                            showOverlayScenario
                              ? "bg-navy text-lemony border-navy"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                          }`}
                          title="Comparar Curva S de Costo del Escenario Optimista, Moderado y Estresado"
                        >
                          {showOverlayScenario ? "📈 Ocultar Abanico" : "📈 Abanico Multiescenario"}
                        </button>
                        <span className="text-[10px] text-slate-500 font-semibold">0% a 100%</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {showOverlayScenario
                        ? "Abanico de dispersión comparando costo final Optimista (verde), Moderado (esmeralda) y Estresado (rojo)."
                        : "Probabilidad acumulada de que el costo final del proyecto o portafolio sea menor o igual a cada valor."}
                    </p>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        {showOverlayScenario && simulationData.multiScenarioCostCurve ? (
                          <AreaChart data={simulationData.multiScenarioCostCurve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="modLabel" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-navy text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-700 space-y-1">
                                      <p className="font-bold text-lemony">Nivel de Confianza: {d.percentile}%</p>
                                      <p className="text-[11px] text-emerald-400">🟢 Optimista: <b>{d.optLabel}</b></p>
                                      <p className="text-[11px] text-emerald-200">🔵 Moderado (EAC): <b>{d.modLabel}</b></p>
                                      <p className="text-[11px] text-rose-400">🔴 Estresado: <b>{d.pessLabel}</b></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "P50", fill: "#f59e0b", fontSize: 10 }} />
                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "P80", fill: "#10b981", fontSize: 10 }} />
                            <Area type="monotone" dataKey="percentile" stroke="#10b981" strokeWidth={1.8} strokeDasharray="3 3" fill="none" name="Optimista" />
                            <Area type="monotone" dataKey="percentile" stroke="#059669" strokeWidth={2.8} fillOpacity={0.15} fill="#059669" name="Moderado" />
                            <Area type="monotone" dataKey="percentile" stroke="#ef4444" strokeWidth={1.8} strokeDasharray="3 3" fill="none" name="Estresado" />
                          </AreaChart>
                        ) : (
                          <AreaChart data={simulationData.costCumulativeCurve || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#a7f3d0" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-navy text-white text-xs p-2 rounded-xl shadow-lg border border-slate-700 space-y-0.5">
                                      <p className="font-bold text-lemony">{data.label}</p>
                                      <p>Nivel de confianza: <b>{data.percentile.toFixed(0)}%</b></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "P50", fill: "#f59e0b", fontSize: 10 }} />
                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "P80", fill: "#10b981", fontSize: 10 }} />
                            <Area type="monotone" dataKey="percentile" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#costGradient)" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Histogram of Cost Distribution */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-navy" />
                        <span>Densidad de Distribución de Costo Final (Histograma)</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold">{iterations.toLocaleString()} iteraciones</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Frecuencia de ocurrencia de rangos de costo final estimado en las iteraciones.
                    </p>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={simulationData.costHistogram || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                          <YAxis tick={{ fontSize: 10 }} unit="%" />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-navy text-white text-xs p-2 rounded-xl shadow-lg border border-slate-700 space-y-0.5">
                                    <p className="font-bold text-lemony">{data.label}</p>
                                    <p>Frecuencia: <b>{data.frequency}%</b> ({data.count} corridas)</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="frequency" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 3: PLAZO VS COSTO (BIVARIADO / JOINT CONFIDENCE)       */}
            {/* ========================================================== */}
            {activeTab === "bivariate" && (
              <div className="space-y-5">
                {/* 4 Quadrant KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/70 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">
                        Q1: Éxito Conjunto (Plazo &amp; Costo)
                      </span>
                      <Target className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-3xl font-black text-emerald-900">
                        {simulationData.probJointSuccess}%
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        Culmina en/antes de fecha límite <b>Y</b> dentro del presupuesto BAC.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider">
                        Q2: En Presupuesto pero Retrasado
                      </span>
                      <Clock className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-sky-900">
                        {(() => {
                          const pts = simulationData.jointScatterPoints || [];
                          const q2 = pts.filter((p) => p.quadrant === "q2").length;
                          return pts.length ? `${((q2 / pts.length) * 100).toFixed(0)}%` : "0%";
                        })()}
                      </p>
                      <p className="text-[11px] text-sky-800 mt-1">
                        Costo final ≤ BAC pero excede la fecha regulatoria CREG o COD.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                        Q3: En Plazo con Sobrecosto
                      </span>
                      <DollarSign className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-amber-900">
                        {(() => {
                          const pts = simulationData.jointScatterPoints || [];
                          const q3 = pts.filter((p) => p.quadrant === "q3").length;
                          return pts.length ? `${((q3 / pts.length) * 100).toFixed(0)}%` : "0%";
                        })()}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Cumple la fecha contractual pero incurre en costos superiores al BAC.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/70 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">
                        Q4: Falla Doble (Retraso &amp; Sobrecosto)
                      </span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-black text-rose-900">
                        {(() => {
                          const pts = simulationData.jointScatterPoints || [];
                          const q4 = pts.filter((p) => p.quadrant === "q4").length;
                          return pts.length ? `${((q4 / pts.length) * 100).toFixed(0)}%` : "0%";
                        })()}
                      </p>
                      <p className="text-[11px] text-rose-800 mt-1">
                        Escenario adverso con penalidades contractuales y exceso de CAPEX.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bivariate Scatter Chart */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-navy" />
                        <span>Distribución Conjunta Bivariada: Fecha Fin vs. Costo Proyectado (EAC)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cada punto representa una corrida estocástica. Las líneas rojas delimitan el umbral de plazo y presupuesto.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
                      <span className="inline-flex items-center gap-1.5 text-emerald-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Q1: Éxito Doble
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sky-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Q2: Retraso en Presupuesto
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-amber-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Q3: En Plazo con Sobrecosto
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-rose-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Q4: Falla Doble
                      </span>
                    </div>
                  </div>

                  <div className="h-[320px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          dataKey="dateMs"
                          name="Fecha Fin"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={(ms) => formatDate(new Date(ms).toISOString().slice(0, 10))}
                          tick={{ fontSize: 9 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="costCop"
                          name="Costo EAC"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={(c) => `$${(c / 1e6).toFixed(0)}M`}
                          tick={{ fontSize: 9 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-navy text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-700 space-y-1">
                                  <p className="font-bold text-lemony">Corrida #{d.id}</p>
                                  <p>📅 Fecha Fin: <b>{d.dateLabel}</b> {d.meetsDate ? "✅" : "❌"}</p>
                                  <p>💰 Costo EAC: <b>{d.costLabel}</b> {d.meetsCost ? "✅" : "❌"}</p>
                                  <p className="text-[10px] text-slate-300">
                                    Cuadrante: <b>{d.quadrant.toUpperCase()}</b>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Reference Limits */}
                        {(simulationData.cregDate || simulationData.codDate || simulationData.p80Date) && (
                          <ReferenceLine
                            x={simulationData.cregDate || simulationData.codDate || simulationData.p80Date}
                            stroke="#ef4444"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            label={{ value: "Límite Plazo", fill: "#ef4444", fontSize: 9, position: "top" }}
                          />
                        )}
                        {(simulationData.bac || simulationData.portfolioBac) > 0 && (
                          <ReferenceLine
                            y={simulationData.bac || simulationData.portfolioBac}
                            stroke="#ef4444"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            label={{ value: "Presupuesto (BAC)", fill: "#ef4444", fontSize: 9, position: "right" }}
                          />
                        )}
                        <Scatter name="Corridas" data={simulationData.jointScatterPoints || []}>
                          {(simulationData.jointScatterPoints || []).map((entry, idx) => {
                            let color = "#ef4444";
                            if (entry.quadrant === "q1") color = "#10b981";
                            else if (entry.quadrant === "q2") color = "#0284c7";
                            else if (entry.quadrant === "q3") color = "#f59e0b";
                            return <Cell key={`dot-${idx}`} fill={color} fillOpacity={0.75} />;
                          })}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 4: SENSIBILIDAD (DIAGRAMA TORNADO)                      */}
            {/* ========================================================== */}
            {activeTab === "tornado" && (
              <div className="space-y-5">
                {/* Metric Switcher Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-black text-navy flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-navy" />
                      <span>Diagrama Tornado de Sensibilidad de Riesgo</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Identifica y jerarquiza los factores de incertidumbre con mayor impacto oscilatorio (swing) sobre el resultado final.
                    </p>
                  </div>

                  <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTornadoMetric("schedule")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        tornadoMetric === "schedule" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                      }`}
                    >
                      📅 Sensibilidad de Plazos (Días)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTornadoMetric("cost")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        tornadoMetric === "cost" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                      }`}
                    >
                      💰 Sensibilidad de Costos (COP)
                    </button>
                  </div>
                </div>

                {/* Main Tornado Chart Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Rango de Desviación Favorable (Izquierda) vs. Desfavorable (Derecha)
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Ordenado por amplitud total de impacto
                    </span>
                  </div>

                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={tornadoMetric === "schedule" ? (simulationData.scheduleTornado || []) : (simulationData.costTornado || [])}
                        margin={{ top: 10, right: 30, left: 160, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9 }}
                          tickFormatter={(v) => tornadoMetric === "schedule" ? `${v}d` : `$${(v / 1e6).toFixed(0)}M`}
                        />
                        <YAxis
                          type="category"
                          dataKey="factor"
                          tick={{ fontSize: 9, fontWeight: 600, fill: "#0f172a" }}
                          width={155}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-navy text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 max-w-xs">
                                  <p className="font-bold text-lemony">{d.factor}</p>
                                  <p className="text-[10px] text-slate-300">{d.description}</p>
                                  <div className="pt-1 border-t border-slate-700/80 grid grid-cols-2 gap-2 text-[11px]">
                                    <span className="text-emerald-400">
                                      🟢 Favorable: <b>{tornadoMetric === "schedule" ? `${d.lowImpact} días` : money(d.lowImpact)}</b>
                                    </span>
                                    <span className="text-rose-400">
                                      🔴 Desfavorable: <b>{tornadoMetric === "schedule" ? `+${d.highImpact} días` : money(d.highImpact)}</b>
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-200 pt-1">
                                    Oscilación Total (Swing): {tornadoMetric === "schedule" ? `${d.swing} días` : money(d.swing)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine x={0} stroke="#0f172a" strokeWidth={1.5} />
                        <Bar dataKey="lowImpact" fill="#10b981" name="Impacto Favorable" radius={[4, 0, 0, 4]} />
                        <Bar dataKey="highImpact" fill="#ef4444" name="Impacto Desfavorable" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Actionable Risk Mitigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-navy text-lemony text-[11px] font-black flex items-center justify-center">1</span>
                      <h5 className="text-xs font-black text-navy">Riesgo #1: Suministros Críticos</h5>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      El mayor potencial de desvío reside en inversores y transformadores. Acciones: monitorear inspecciones FAT en fábrica y reservar slots de flete con 60 días de anticipación.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-navy text-lemony text-[11px] font-black flex items-center justify-center">2</span>
                      <h5 className="text-xs font-black text-navy">Riesgo #2: Pruebas con el OR</h5>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Las observaciones en la matriz de protecciones generan colas de retraso de hasta 45 días. Acciones: radicar estudios eléctricos validados y agendar mesas de trabajo técnicas quincenales.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-navy text-lemony text-[11px] font-black flex items-center justify-center">3</span>
                      <h5 className="text-xs font-black text-navy">Riesgo #3: Volatilidad TRM</h5>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Cubre hasta el 65% de la dispersión de costo en obras con componentes en USD. Acciones: evaluar coberturas cambiarias (Forwards) al formalizar órdenes de compra.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 5: SIMULADOR INTERACTIVO WHAT-IF                       */}
            {/* ========================================================== */}
            {activeTab === "whatif" && (
              <div className="space-y-5">
                {/* Header Banner */}
                <div className="p-4 rounded-2xl bg-navy text-white flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-lemony" />
                      <span>Simulador Interactivo de Palancas de Decisión (What-If)</span>
                    </h3>
                    <p className="text-xs text-slate-200 mt-0.5">
                      Ajusta las variables operativas en tiempo real para evaluar el impacto inmediato sobre los plazos P80 y la contingencia de costos.
                    </p>
                  </div>
                  {hasWhatIfActive && (
                    <button
                      type="button"
                      onClick={handleResetWhatIf}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer Palancas</span>
                    </button>
                  )}
                </div>

                {/* Live Impact Deltas Comparison Cards */}
                {baseSimulationData && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Delta 1: Fecha P80 */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Fecha P80 (Compromiso)
                      </span>
                      <p className="text-2xl font-black text-navy mt-1">
                        {dateStr(simulationData.isSingle ? simulationData.p80Date : simulationData.portfolioP80Date)}
                      </p>
                      {(() => {
                        const baseDate = simulationData.isSingle ? baseSimulationData.p80Date : baseSimulationData.portfolioP80Date;
                        const currDate = simulationData.isSingle ? simulationData.p80Date : simulationData.portfolioP80Date;
                        const deltaDays = (baseDate && currDate) ? Math.round((currDate - baseDate) / 86400000) : 0;
                        if (deltaDays === 0) return <span className="text-[11px] text-slate-400 mt-1 block">Sin variación vs base</span>;
                        return (
                          <span className={`text-[11px] font-bold mt-1 block ${deltaDays < 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {deltaDays < 0 ? `🟢 ${deltaDays} días de adelanto` : `🔴 +${deltaDays} días de retraso`}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Delta 2: Costo P80 */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Costo P80 Proyectado
                      </span>
                      <p className="text-2xl font-black text-slate-900 mt-1 truncate" title={money(simulationData.p80Cost)}>
                        {money(simulationData.p80Cost)}
                      </p>
                      {(() => {
                        const deltaCost = (simulationData.p80Cost || 0) - (baseSimulationData.p80Cost || 0);
                        if (Math.abs(deltaCost) < 1000) return <span className="text-[11px] text-slate-400 mt-1 block">Sin variación vs base</span>;
                        return (
                          <span className={`text-[11px] font-bold mt-1 block truncate ${deltaCost < 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {deltaCost < 0 ? `🟢 -${money(Math.abs(deltaCost))}` : `🔴 +${money(deltaCost)}`}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Delta 3: Probabilidad CREG */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Probabilidad CREG
                      </span>
                      <p className="text-2xl font-black text-navy mt-1">
                        {simulationData.isSingle
                          ? (simulationData.probCregSuccess !== null ? `${simulationData.probCregSuccess}%` : "—")
                          : `${simulationData.probPortfolioCregSuccess}%`}
                      </p>
                      {(() => {
                        const baseProb = simulationData.isSingle ? baseSimulationData.probCregSuccess : baseSimulationData.probPortfolioCregSuccess;
                        const currProb = simulationData.isSingle ? simulationData.probCregSuccess : simulationData.probPortfolioCregSuccess;
                        if (baseProb === null || currProb === null) return <span className="text-[11px] text-slate-400 mt-1 block">Sin meta CREG</span>;
                        const deltaProb = Number((currProb - baseProb).toFixed(1));
                        if (deltaProb === 0) return <span className="text-[11px] text-slate-400 mt-1 block">Sin variación vs base</span>;
                        return (
                          <span className={`text-[11px] font-bold mt-1 block ${deltaProb > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {deltaProb > 0 ? `🟢 +${deltaProb}% de mejora` : `🔴 ${deltaProb}% de reducción`}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Delta 4: Probabilidad Conjunta */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Probabilidad Conjunta
                      </span>
                      <p className="text-2xl font-black text-navy mt-1">
                        {simulationData.probJointSuccess}%
                      </p>
                      {(() => {
                        const baseProb = baseSimulationData.probJointSuccess || 0;
                        const currProb = simulationData.probJointSuccess || 0;
                        const deltaProb = Number((currProb - baseProb).toFixed(1));
                        if (deltaProb === 0) return <span className="text-[11px] text-slate-400 mt-1 block">Sin variación vs base</span>;
                        return (
                          <span className={`text-[11px] font-bold mt-1 block ${deltaProb > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {deltaProb > 0 ? `🟢 +${deltaProb}%` : `🔴 ${deltaProb}%`}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* 4 Interactive Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slider 1: Suministro de Equipos Críticos */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                        <span>🚢 Logística / Suministro de Equipos</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        whatIf.equipmentOffsetDays < 0 ? "bg-emerald-100 text-emerald-800" : whatIf.equipmentOffsetDays > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {whatIf.equipmentOffsetDays > 0 ? `+${whatIf.equipmentOffsetDays} días` : `${whatIf.equipmentOffsetDays} días`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={60}
                      step={5}
                      value={whatIf.equipmentOffsetDays}
                      onChange={(e) => setWhatIf({ ...whatIf, equipmentOffsetDays: Number(e.target.value) })}
                      className="w-full accent-navy cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>-30d (Flete Aéreo / Adelanto)</span>
                      <span>0d (Base)</span>
                      <span>+60d (Atraso Marítimo)</span>
                    </div>
                  </div>

                  {/* Slider 2: Volatilidad / Ajuste de TRM */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                        <span>💵 Choque / Ajuste de TRM (USD/COP)</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        whatIf.trmOffsetPct < 0 ? "bg-emerald-100 text-emerald-800" : whatIf.trmOffsetPct > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {whatIf.trmOffsetPct > 0 ? `+${whatIf.trmOffsetPct}%` : `${whatIf.trmOffsetPct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-15}
                      max={25}
                      step={2.5}
                      value={whatIf.trmOffsetPct}
                      onChange={(e) => setWhatIf({ ...whatIf, trmOffsetPct: Number(e.target.value) })}
                      className="w-full accent-navy cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>-15% (Revaluación Peso)</span>
                      <span>0% (TRM Actual)</span>
                      <span>+25% (Devaluación Severa)</span>
                    </div>
                  </div>

                  {/* Slider 3: Aceleración EPC (Frentes & Turnos) */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                        <span>⚡ Rendimiento EPC / Frentes de Trabajo</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        whatIf.epcAccelerationPct > 0 ? "bg-emerald-100 text-emerald-800" : whatIf.epcAccelerationPct < 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {whatIf.epcAccelerationPct > 0 ? `+${whatIf.epcAccelerationPct}% (Acelerado)` : `${whatIf.epcAccelerationPct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={30}
                      step={5}
                      value={whatIf.epcAccelerationPct}
                      onChange={(e) => setWhatIf({ ...whatIf, epcAccelerationPct: Number(e.target.value) })}
                      className="w-full accent-navy cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>-20% (Menor cuadrilla)</span>
                      <span>0% (Rendimiento Histórico)</span>
                      <span>+30% (Turnos Dobles / 2 Frentes)</span>
                    </div>
                  </div>

                  {/* Slider 4: Trámites y Pruebas con OR */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                        <span>🔌 Pruebas de Conexión con Operador de Red</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        whatIf.regulatoryOffsetDays < 0 ? "bg-emerald-100 text-emerald-800" : whatIf.regulatoryOffsetDays > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {whatIf.regulatoryOffsetDays > 0 ? `+${whatIf.regulatoryOffsetDays} días` : `${whatIf.regulatoryOffsetDays} días`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-15}
                      max={45}
                      step={5}
                      value={whatIf.regulatoryOffsetDays}
                      onChange={(e) => setWhatIf({ ...whatIf, regulatoryOffsetDays: Number(e.target.value) })}
                      className="w-full accent-navy cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>-15d (Aprobación Rápida)</span>
                      <span>0d (Plazo Previsto)</span>
                      <span>+45d (Observaciones Repetidas)</span>
                    </div>
                  </div>
                </div>

                {/* What-If Strategic Recommendation */}
                <div className="p-4 rounded-2xl border border-navy/20 bg-navy/5 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                  <div className="text-xs text-navy space-y-1">
                    <p className="font-black">Recomendación Táctica para Comités de Decisión:</p>
                    <p className="text-slate-700 leading-relaxed">
                      Utiliza estas palancas en comités directivos para negociar con el contratista EPC. Por ejemplo, si un atraso de 30 días en inversores se neutraliza activando un segundo frente de trabajo (+15% en rendimiento), evalúa si el costo adicional de cuadrillas es inferior a la penalidad diaria por retraso CREG.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 6: MATRIZ DETALLADA POR PROYECTO                       */}
            {/* ========================================================== */}
            {activeTab === "matrix" && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-navy uppercase tracking-wider">
                    Matriz de Riesgo Monte Carlo por Proyecto ({projects.length})
                  </span>
                  <span className="text-slate-500 font-medium">Nivel de Confianza: P50 (Mediana) y P80 (Compromiso PMO)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-navy text-white font-semibold select-none text-[11px]">
                        <th className="p-2.5 pl-3 text-left">Proyecto</th>
                        <th className="p-2.5 text-center w-[75px]">% Avance</th>
                        <th className="p-2.5 text-center">Fecha COD</th>
                        <th className="p-2.5 text-center">Fecha P50</th>
                        <th className="p-2.5 text-center">Fecha P80</th>
                        <th className="p-2.5 text-center w-[90px]">Prob. CREG</th>
                        <th className="p-2.5 text-right">Presup. (BAC)</th>
                        <th className="p-2.5 text-right">Costo P50</th>
                        <th className="p-2.5 text-right">Costo P80</th>
                        <th className="p-2.5 text-right pr-3">Contingencia P80</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-[11.5px]">
                      {(simulationData.projectResults || [simulationData]).map((pRes, idx) => {
                        const isConnected = pRes.isCompleted;
                        return (
                          <tr key={pRes.projectId || idx} className={idx % 2 ? "bg-slate-50/70" : "bg-white"}>
                            <td className="p-2.5 pl-3 font-bold text-navy whitespace-nowrap">
                              {pRes.projectName}
                            </td>
                            <td className="p-2.5 text-center font-medium">
                              {pRes.realProgress !== undefined ? `${pRes.realProgress}%` : "—"}
                            </td>
                            <td className="p-2.5 text-center text-slate-600">
                              {pRes.codDate ? dateStr(pRes.codDate) : "—"}
                            </td>
                            <td className="p-2.5 text-center font-semibold text-slate-800">
                              {isConnected ? "Conectado" : dateStr(pRes.p50Date)}
                            </td>
                            <td className="p-2.5 text-center font-bold text-navy">
                              {isConnected ? "Conectado" : dateStr(pRes.p80Date)}
                            </td>
                            <td className="p-2.5 text-center">
                              {isConnected ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  100%
                                </span>
                              ) : pRes.probCregSuccess !== null ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    pRes.probCregSuccess >= 80
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : pRes.probCregSuccess >= 50
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-rose-50 text-rose-800 border-rose-200"
                                  }`}
                                >
                                  {pRes.probCregSuccess}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right tabular-nums font-semibold text-slate-700">
                              {money(pRes.bac)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums text-slate-800">
                              {money(pRes.p50Cost)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums font-bold text-navy">
                              {money(pRes.p80Cost)}
                            </td>
                            <td className="p-2.5 pr-3 text-right tabular-nums font-black text-amber-900">
                              {pRes.costContingencyCopP80 > 0 ? money(pRes.costContingencyCopP80) : "$0"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Executive Recommendations Box */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3 shadow-2xs print-avoid-break">
              <Info className="w-5 h-5 text-navy shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-bold text-navy">
                  Interpretación y Recomendaciones Metodológicas PMO:
                </p>
                <p className="leading-relaxed">
                  • <b>Compromiso de Plazos (P80):</b> Para mitigar penalidades regulatorias CREG y sobrecostos por extensión de obra, la PMO debe planificar las entregas operativas tomando como referencia la fecha <b>P80</b> (nivel de confianza del 80%) y no la estimación media o determinística.
                </p>
                <p className="leading-relaxed">
                  • <b>Reserva de Contingencia:</b> La variabilidad presupuestal aconseja reservar un colchón de contingencia de <b>{money(simulationData.isSingle ? simulationData.costContingencyCopP80 : simulationData.financialContingencyP80)}</b> para absorber posibles desviaciones de CPI residual y fluctuaciones de TRM.
                </p>
              </div>
            </div>

            {/* Corporate Print Footer Watermark */}
            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-2 border-t border-slate-100">
              <span>PMO Control Tracker • Módulo Estocástico Monte Carlo • Confidencial</span>
              <span>Generado con {iterations.toLocaleString()} iteraciones el {new Date().toLocaleDateString("es-CO")}</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
