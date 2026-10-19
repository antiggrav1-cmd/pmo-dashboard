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
  Info
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
  ReferenceLine
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
  const [activeTab, setActiveTab] = useState("schedule"); // "schedule" | "cost" | "matrix"
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [iterations, setIterations] = useState(2500);
  const [stressLevel, setStressLevel] = useState("moderate"); // "optimistic" | "moderate" | "pessimistic"
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSeed, setSimSeed] = useState(0);

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

  // Run Simulation
  const simulationData = useMemo(() => {
    // simSeed triggers recalculation
    if (!isOpen || !projects.length) return null;

    const portfolioRes = runPortfolioMonteCarlo(projects, iterations, { stressLevel });

    if (selectedProject) {
      const singleRes = simulateSingleProject(selectedProject, iterations, { stressLevel });
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
  }, [isOpen, projects, selectedProject, iterations, stressLevel, simSeed]);

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
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "schedule" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Plazos &amp; CREG</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cost")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "cost" ? "bg-navy text-lemony shadow-xs" : "text-slate-600 hover:text-navy"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Costos &amp; Margen</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
                      <span className="text-[10px] text-slate-500 font-semibold">0% a 100%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Muestra la probabilidad acumulada de energizar el proyecto o portafolio en o antes de cada fecha.
                    </p>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
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
                      <span className="text-[10px] text-slate-500 font-semibold">0% a 100%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Probabilidad acumulada de que el costo final del proyecto o portafolio sea menor o igual a cada valor.
                    </p>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
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
            {/* TAB 3: MATRIZ DETALLADA POR PROYECTO                       */}
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
