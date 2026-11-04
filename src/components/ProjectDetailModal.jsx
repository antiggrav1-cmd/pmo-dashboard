import React, { memo, useState, useMemo, useCallback, useEffect } from "react";
import { 
  X, 
  Save, 
  Building2, 
  DollarSign, 
  User, 
  FileText, 
  Radio, 
  Coins, 
  Info, 
  Check, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag
} from "lucide-react";
import { 
  formatCurrencyCop, 
  formatCurrencyUsd, 
  formatDate,
  calculateGap,
  getProjectProgressAndStatus
} from "../utils/calculations";
import { ConnectionFlowStepper } from "./ConnectionFlowStepper";
import { RESTRICTION_STYLES, STATUS_STYLES } from "../constants/commentStyles";
import { RESTRICTION_CATEGORIES, RESTRICTION_STATUSES } from "../models/projectModel";

const COMMON_OPERATORS = [
  "Enel Colombia",
  "EPM (Empresas Públicas de Medellín)",
  "Celsia",
  "Air-e",
  "Afinia (Grupo EPM)",
  "CHEC (Caldas)",
  "ESSA (Santander)",
  "EDEQ (Quindío)",
  "Cedenar (Nariño)",
  "Electrohuila",
  "EMSA (Meta)",
  "CEO (Cauca)",
  "Enerca (Casanare)",
  "Dispac (Chocó)"
];

const MILESTONE_STATUS_STYLES = {
  "Cobrado": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Por cobrar": "bg-amber-100 text-amber-800 border-amber-300",
  "En trámite": "bg-sky-100 text-sky-800 border-sky-300",
  "Saldo Pendiente": "bg-purple-100 text-purple-800 border-purple-300"
};

export const ProjectDetailModal = memo(function ProjectDetailModal({
  isOpen,
  project,
  onSave,
  onClose,
  portfolios = [],
  currentPortfolioId = "",
  onMoveProject,
  onSelectPortfolio,
  projects = [],
  onNavigateProject
}) {
  const initFormData = (p) => ({
    name: p?.name || "",
    xm: p?.xm || "",
    portfolioId: p?.portfolioId || currentPortfolioId || "",
    operadorRed: p?.operadorRed || p?.operator || "",
    manager: p?.manager || "",
    residenteCivil: p?.residenteCivil || "",
    residenteElectrico: p?.residenteElectrico || "",
    connectionState: p?.connectionState || "Ingeniería",
    capexCop: Number(p?.capexCop) || 0,
    capexUsd: Number(p?.capexUsd) || 0,
    bacCOP: Number(p?.bacCOP) || 0,
    bacUSD: Number(p?.bacUSD) || 0,
    trmProyecto: Number(p?.trmProyecto) || 0,
    obraRealProgress: p?.obraRealProgress !== undefined ? Number(p?.obraRealProgress) || 0 : (p?.avanceObra !== undefined ? Number(p?.avanceObra) || 0 : 0),
    obraScheduledProgress: p?.obraScheduledProgress !== undefined ? Number(p?.obraScheduledProgress) || 0 : (p?.avanceObraProg !== undefined ? Number(p?.avanceObraProg) || 0 : 0)
  });

  const [activeTab, setActiveTab] = useState("ficha"); // "ficha" | "hitos" | "comentarios"
  const [prevProject, setPrevProject] = useState(project);
  const [formData, setFormData] = useState(() => initFormData(project));
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick comment form state
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("");
  const [newCommentCategory, setNewCommentCategory] = useState("General");
  const [newCommentStatus, setNewCommentStatus] = useState("Pendiente");

  // Sync form when project changes
  if (project !== prevProject) {
    setPrevProject(project);
    setFormData(initFormData(project));
    if (savedSuccess) setSavedSuccess(false);
  }

  // Project sequential navigation in Drawer
  const currentIndex = useMemo(() => {
    if (!project || !projects || projects.length === 0) return -1;
    return projects.findIndex((p) => p.id === project.id);
  }, [project, projects]);

  const totalProjects = projects.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < totalProjects - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigateProject) {
      onNavigateProject(projects[currentIndex - 1]);
    }
  }, [hasPrev, onNavigateProject, projects, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigateProject) {
      onNavigateProject(projects[currentIndex + 1]);
    }
  }, [hasNext, onNavigateProject, projects, currentIndex]);

  // Keyboard navigation: Escape to close, Alt+Left/Right to switch projects
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.altKey && e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.altKey && e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !project) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, rawValue) => {
    const num = rawValue === "" ? 0 : Math.max(0, Number(rawValue) || 0);
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const updated = {
      ...project,
      name: formData.name.trim(),
      xm: formData.xm.trim(),
      operadorRed: formData.operadorRed.trim(),
      manager: formData.manager.trim(),
      residenteCivil: formData.residenteCivil.trim(),
      residenteElectrico: formData.residenteElectrico.trim(),
      connectionState: formData.connectionState,
      gridConnected: formData.connectionState === "Energizado" || formData.connectionState === "Entregado",
      capexCop: formData.capexCop,
      capexUsd: formData.capexUsd,
      bacCOP: formData.bacCOP,
      bacUSD: formData.bacUSD,
      trmProyecto: formData.trmProyecto,
      obraRealProgress: formData.obraRealProgress,
      obraScheduledProgress: formData.obraScheduledProgress
    };

    const isMoving = Boolean(
      formData.portfolioId &&
      currentPortfolioId &&
      formData.portfolioId !== currentPortfolioId &&
      onMoveProject
    );

    if (isMoving) {
      const cleanId = String(project.id).includes("::") ? project.id.split("::")[1] : project.id;
      onMoveProject(cleanId, formData.portfolioId, currentPortfolioId, updated);
      if (onSelectPortfolio) {
        onSelectPortfolio(formData.portfolioId);
      }
    } else {
      onSave(updated);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1500);
  };

  // Add quick comment
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      author: newCommentAuthor.trim() || formData.manager || "PMO",
      text: newCommentText.trim(),
      category: newCommentCategory || "General",
      status: newCommentStatus || "Pendiente",
      date: new Date().toISOString()
    };

    const updatedComments = [newComment, ...(project.comments || [])];
    onSave({ ...project, comments: updatedComments });
    setNewCommentText("");
  };

  // Financial summary for milestones tab
  const paymentMilestones = project.paymentMilestones || [];
  const milestonesFinancials = paymentMilestones.reduce(
    (acc, m) => {
      const isCobrado = (m.status || "").toLowerCase().includes("cobrad");
      const valCop = Number(m.valueCop) || 0;
      const valUsd = Number(m.valueUsd) || 0;
      acc.totalCop += valCop;
      acc.totalUsd += valUsd;
      if (isCobrado) {
        acc.cobradoCop += valCop;
        acc.cobradoUsd += valUsd;
      } else {
        acc.pendienteCop += valCop;
        acc.pendienteUsd += valUsd;
      }
      return acc;
    },
    { totalCop: 0, totalUsd: 0, cobradoCop: 0, cobradoUsd: 0, pendienteCop: 0, pendienteUsd: 0 }
  );

  const currentPortfolioName = (portfolios.find((p) => p.id === currentPortfolioId) || {}).name;
  const { gap, status } = getProjectProgressAndStatus(project);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop con clic para cerrar */}
      <div 
        className="fixed inset-0 bg-navy/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
          
          {/* Header con navegación de proyectos */}
          <div className="p-4 sm:p-5 bg-navy text-white flex items-center justify-between border-b border-navy-light shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-lemony text-navy shadow-xs shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black truncate text-white" title={project.name}>
                    {formData.name || "Ficha del Proyecto"}
                  </h2>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-navy-light text-lemony border border-lemony/30 shrink-0">
                    {formData.connectionState}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  Panel Lateral • {currentPortfolioName || "Portafolio"} • GAP: <span className="font-bold text-lemony">{gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}</span> ({status})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Navegación Anterior / Siguiente */}
              {totalProjects > 1 && (
                <div className="flex items-center bg-navy-dark/90 rounded-xl p-0.5 border border-white/10 mr-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      hasPrev
                        ? "text-white hover:bg-white/20 active:scale-95"
                        : "text-white/25 cursor-not-allowed"
                    }`}
                    title={hasPrev ? `Anterior: ${projects[currentIndex - 1]?.name} (Alt + ←)` : "Primer proyecto"}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-bold text-slate-200 px-2 select-none">
                    {currentIndex >= 0 ? `${currentIndex + 1}/${totalProjects}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasNext}
                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      hasNext
                        ? "text-white hover:bg-white/20 active:scale-95"
                        : "text-white/25 cursor-not-allowed"
                    }`}
                    title={hasNext ? `Siguiente: ${projects[currentIndex + 1]?.name} (Alt + →)` : "Último proyecto"}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Cerrar Drawer */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar panel (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs inside Drawer */}
          <div className="bg-slate-100 border-b border-slate-200/90 px-4 pt-2 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("ficha")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
                activeTab === "ficha"
                  ? "bg-white text-navy border-slate-200/90 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Ficha & Operación</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("hitos")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
                activeTab === "hitos"
                  ? "bg-white text-navy border-slate-200/90 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Hitos de Pago</span>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {paymentMilestones.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("comentarios")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
                activeTab === "comentarios"
                  ? "bg-white text-navy border-slate-200/90 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Novedades & Bitácora</span>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {(project.comments || []).length}
              </span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            
            {/* TAB 1: FICHA Y DATOS MAESTROS */}
            {activeTab === "ficha" && (
              <form id="project-detail-form" onSubmit={handleSubmit} className="space-y-5">
                {/* SECCIÓN 1: DATOS GENERALES Y OPERACIÓN */}
                <section className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 text-navy pb-1 border-b border-slate-200/60">
                    <Radio className="w-4 h-4 text-lemony-dark" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      1. Datos Generales y Operación
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Nombre del Proyecto */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>Nombre del Proyecto *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Ej: Parque Solar La Unión"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Archivo XM / Código */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Archivo XM / Código</span>
                      </label>
                      <input
                        type="text"
                        value={formData.xm}
                        onChange={(e) => handleChange("xm", e.target.value)}
                        placeholder="Ej: XM-SUN-042"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Portafolio al que pertenece */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>Portafolio al que pertenece *</span>
                      </label>
                      <select
                        value={formData.portfolioId}
                        onChange={(e) => handleChange("portfolioId", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        {portfolios.map((port) => (
                          <option key={port.id} value={port.id}>
                            {port.name} {port.code ? `(${port.code})` : ""}
                          </option>
                        ))}
                      </select>
                      {formData.portfolioId && currentPortfolioId && formData.portfolioId !== currentPortfolioId && (
                        <span className="text-[10px] text-amber-700 font-bold block pt-0.5 animate-in fade-in">
                          ⚠️ Al guardar, el proyecto se transferirá a este portafolio
                        </span>
                      )}
                    </div>

                    {/* Operador de Red */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Operador de Red (OR)</span>
                      </label>
                      <input
                        type="text"
                        list="operators-list"
                        value={formData.operadorRed}
                        onChange={(e) => handleChange("operadorRed", e.target.value)}
                        placeholder="Ej: Enel Colombia, EPM, Celsia..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                      <datalist id="operators-list">
                        {COMMON_OPERATORS.map((op) => (
                          <option key={op} value={op} />
                        ))}
                      </datalist>
                    </div>

                    {/* Gerente del Proyecto */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Gerente del Proyecto</span>
                      </label>
                      <input
                        type="text"
                        value={formData.manager}
                        onChange={(e) => handleChange("manager", e.target.value)}
                        placeholder="Nombre del Gerente PMO"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Residente Civil */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Residente de Obra Civil</span>
                      </label>
                      <input
                        type="text"
                        value={formData.residenteCivil}
                        onChange={(e) => handleChange("residenteCivil", e.target.value)}
                        placeholder="Nombre residente civil"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Residente Eléctrico */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Residente de Obra Eléctrica</span>
                      </label>
                      <input
                        type="text"
                        value={formData.residenteElectrico}
                        onChange={(e) => handleChange("residenteElectrico", e.target.value)}
                        placeholder="Nombre residente eléctrico"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Estado de Conexión Stepper */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-2">
                      Estado de Conexión al SIN / Maduración
                    </label>
                    <ConnectionFlowStepper
                      currentState={formData.connectionState}
                      onChange={(newState) => handleChange("connectionState", newState)}
                    />
                  </div>
                </section>

                {/* SECCIÓN 2: HITOS DE AVANCE DE OBRA */}
                <section className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 text-navy pb-1 border-b border-slate-200/60">
                    <Briefcase className="w-4 h-4 text-lemony-dark" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      2. Avance de Obra Real vs Programado
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* % Avance de Obra Real */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>% Avance de Obra Real</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.obraRealProgress || ""}
                          onChange={(e) => handleNumberChange("obraRealProgress", e.target.value)}
                          placeholder="0.0"
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>

                    {/* % Avance de Obra Programado */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>% Avance de Obra Programado</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.obraScheduledProgress || ""}
                          onChange={(e) => handleNumberChange("obraScheduledProgress", e.target.value)}
                          placeholder="0.0"
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECCIÓN 3: PRESUPUESTO Y VALORES FINANCIEROS */}
                <section className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 text-navy pb-1 border-b border-slate-200/60">
                    <DollarSign className="w-4 h-4 text-lemony-dark" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      3. Presupuesto Base y CAPEX
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* CAPEX COP */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>CAPEX Presupuestado (COP)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.capexCop || ""}
                          onChange={(e) => handleNumberChange("capexCop", e.target.value)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {formatCurrencyCop(formData.capexCop)}
                      </span>
                    </div>

                    {/* CAPEX USD */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>CAPEX Presupuestado (USD)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.capexUsd || ""}
                          onChange={(e) => handleNumberChange("capexUsd", e.target.value)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {formatCurrencyUsd(formData.capexUsd)}
                      </span>
                    </div>

                    {/* BAC COP */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>BAC - Presupuesto a la Conclusión (COP)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.bacCOP || ""}
                          onChange={(e) => handleNumberChange("bacCOP", e.target.value)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {formatCurrencyCop(formData.bacCOP)}
                      </span>
                    </div>

                    {/* BAC USD */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>BAC - Presupuesto a la Conclusión (USD)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.bacUSD || ""}
                          onChange={(e) => handleNumberChange("bacUSD", e.target.value)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {formatCurrencyUsd(formData.bacUSD)}
                      </span>
                    </div>

                    {/* TRM Proyecto */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-slate-400" />
                        <span>TRM del Proyecto (COP/USD)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.trmProyecto || ""}
                          onChange={(e) => handleNumberChange("trmProyecto", e.target.value)}
                          placeholder="Ej: 4150"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Tasa pactada para conversiones combinadas del proyecto.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-blue-900 text-[11px]">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      El <strong>Costo Real (AC COP / AC USD)</strong> se carga y actualiza periódicamente en cada corte quincenal dentro de la pestaña <strong>Presupuesto</strong>.
                    </span>
                  </div>
                </section>
              </form>
            )}

            {/* TAB 2: HITOS DE FACTURACIÓN */}
            {activeTab === "hitos" && (
              <div className="space-y-4">
                {/* Financial KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Total Cobrado
                    </span>
                    <p className="text-sm font-black text-emerald-950 mt-1">
                      {formatCurrencyCop(milestonesFinancials.cobradoCop)}
                    </p>
                    <p className="text-xs font-semibold text-emerald-800">
                      {formatCurrencyUsd(milestonesFinancials.cobradoUsd)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Por Cobrar / Pendiente
                    </span>
                    <p className="text-sm font-black text-amber-950 mt-1">
                      {formatCurrencyCop(milestonesFinancials.pendienteCop)}
                    </p>
                    <p className="text-xs font-semibold text-amber-800">
                      {formatCurrencyUsd(milestonesFinancials.pendienteUsd)}
                    </p>
                  </div>
                </div>

                {/* Milestones list */}
                {paymentMilestones.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No hay hitos de pago registrados para este proyecto.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Puedes gestionarlos desde la pestaña Hitos de Pago en el menú principal.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentMilestones.map((m, idx) => {
                      const st = m.status || "Por cobrar";
                      const badgeStyle = MILESTONE_STATUS_STYLES[st] || "bg-slate-100 text-slate-700 border-slate-200";
                      return (
                        <div key={m.id || idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{m.name}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                {st}
                              </span>
                            </div>
                            {m.notes && (
                              <p className="text-[11px] text-slate-500 mt-1 italic">
                                "{m.notes}"
                              </p>
                            )}
                            {m.submittedAt && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Fecha radicación: {formatDate(m.submittedAt)}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {Number(m.valueCop) > 0 && (
                              <p className="text-xs font-bold text-slate-900">{formatCurrencyCop(m.valueCop)}</p>
                            )}
                            {Number(m.valueUsd) > 0 && (
                              <p className="text-[11px] font-semibold text-slate-600">{formatCurrencyUsd(m.valueUsd)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: NOVEDADES Y COMENTARIOS */}
            {activeTab === "comentarios" && (
              <div className="space-y-4">
                {/* Formulario rápido para añadir comentario */}
                <form onSubmit={handleAddComment} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                    <Plus className="w-3.5 h-3.5 text-navy" />
                    <span>Registrar Novedad o Restricción</span>
                  </div>

                  <textarea
                    rows={2}
                    required
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Describe la novedad, cuello de botella o avance del proyecto..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Categoría</label>
                      <select
                        value={newCommentCategory}
                        onChange={(e) => setNewCommentCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        {RESTRICTION_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Estado</label>
                      <select
                        value={newCommentStatus}
                        onChange={(e) => setNewCommentStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        {RESTRICTION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Autor</label>
                      <input
                        type="text"
                        value={newCommentAuthor}
                        onChange={(e) => setNewCommentAuthor(e.target.value)}
                        placeholder={formData.manager || "PMO"}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Novedad</span>
                    </button>
                  </div>
                </form>

                {/* Lista de comentarios */}
                {(project.comments || []).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No hay novedades registradas para este proyecto.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Utiliza el recuadro superior para agregar la primera observación.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(project.comments || []).map((c, idx) => {
                      const catStyle = RESTRICTION_STYLES[c.category] || RESTRICTION_STYLES["General"];
                      const stStyle = STATUS_STYLES[c.status] || STATUS_STYLES["Pendiente"];
                      return (
                        <div key={c.id || idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catStyle}`}>
                                {c.category || "General"}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stStyle}`}>
                                {c.status || "Pendiente"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {c.date ? formatDate(c.date.slice(0, 10)) : ""}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            {c.text}
                          </p>

                          <div className="text-[10px] text-slate-400 font-semibold">
                            Registrado por: <span className="text-slate-600">{c.author || "PMO"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {activeTab === "ficha" ? "Edita y guarda los datos maestros" : `Proyecto: ${project.name}`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              {activeTab === "ficha" && (
                <button
                  type="submit"
                  form="project-detail-form"
                  className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer ${
                    savedSuccess
                      ? "bg-emerald-600 text-white"
                      : "bg-navy text-lemony hover:bg-navy-dark"
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>¡Ficha Guardada!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Ficha</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});
