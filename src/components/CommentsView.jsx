import React, { useState, useMemo, memo, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock3,
  HelpCircle,
  X,
  Save,
  Tag,
  Briefcase,
  Download,
  Copy,
  Check,
  FileDown
} from "lucide-react";
import { formatDate } from "../utils/calculations";
import { RESTRICTION_CATEGORIES, RESTRICTION_STATUSES, isCommentCompleted } from "../models/projectModel";

import { RESTRICTION_STYLES, STATUS_STYLES } from "../constants/commentStyles";


function formatDateTime(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateStr = formatDate(isoString.slice(0, 10));
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${dateStr}, ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return isoString;
  }
}

/**
 * Helper to generate a clean, readable text report for an individual project (WhatsApp, Teams, Slack)
 */
function generateProjectUnresolvedText(projectName, projectManager, portfolioName, items) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const timeFormatted = `${formattedHours}:${minutes} ${ampm}`;

  // Count active items (excluding completed/resueltas)
  const activeItems = (items || []).filter((i) => !isCommentCompleted(i));

  let text = `📋 REPORTE DE NOVEDADES Y OBSERVACIONES\n`;
  text += `Portafolio: ${portfolioName || "Portafolio Activo"}\n`;
  text += `Proyecto: ${projectName}\n`;
  text += `Ing. de proyecto: ${projectManager || "Sin asignar"}\n`;
  text += `Fecha de corte: ${dateFormatted}, ${timeFormatted}\n`;
  text += `Total novedades activas: ${activeItems.length}\n`;
  text += `${"═".repeat(50)}\n\n`;

  if (activeItems.length === 0) {
    text += `✅ No hay novedades ni observaciones activas para este proyecto.\n`;
    return text;
  }

  activeItems.forEach((item, index) => {
    text += `📌 ${index + 1}. [${item.restriccion || "General"}] — Estado: ${item.estado || "Activa"}\n`;
    text += `   • Responsable: ${item.responsable || "PMO Team"}\n`;
    text += `   • Comentario: ${item.comentario || item.texto || "—"}\n`;
    if (item.notas) {
      text += `   • Notas de seguimiento: ${item.notas}\n`;
    }
    if (item.respuesta) {
      text += `   • Plan de acción / Respuesta: ${item.respuesta}\n`;
    }
    text += `\n${"─".repeat(40)}\n\n`;
  });

  text += `Generado automáticamente por el Sistema PMO.\n`;
  return text;
}

/**
 * Helper to generate a consolidated text report across all projects
 */
function generateConsolidatedUnresolvedText(items, portfolioTitle) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const timeFormatted = `${formattedHours}:${minutes} ${ampm}`;

  const activeItems = (items || []).filter((i) => !isCommentCompleted(i));

  let text = `📋 REPORTE DE NOVEDADES Y OBSERVACIONES\n`;
  if (portfolioTitle) {
    text += `Portafolio: ${portfolioTitle}\n`;
  }
  text += `Fecha de corte: ${dateFormatted}, ${timeFormatted}\n`;
  text += `Total novedades activas: ${activeItems.length}\n`;
  text += `${"═".repeat(50)}\n\n`;

  if (activeItems.length === 0) {
    text += `✅ No hay novedades ni restricciones activas en este momento.\n`;
    return text;
  }

  // Group by project
  const grouped = {};
  activeItems.forEach((item) => {
    const pName = item.proyectoNombre || "Sin Proyecto";
    if (!grouped[pName]) {
      grouped[pName] = {
        manager: item.proyectoManager || "Sin asignar",
        items: []
      };
    }
    grouped[pName].items.push(item);
  });

  Object.entries(grouped).forEach(([projName, projData]) => {
    text += `🏢 PROYECTO: ${projName.toUpperCase()}\n`;
    text += `Ing. de proyecto: ${projData.manager}\n`;
    text += `Novedades activas: ${projData.items.length}\n`;
    text += `${"─".repeat(45)}\n`;
    projData.items.forEach((item, index) => {
      text += `   ${index + 1}. [${item.restriccion || "General"}] — Estado: ${item.estado || "Activa"}\n`;
      text += `      • Responsable: ${item.responsable || "PMO Team"}\n`;
      text += `      • Comentario: ${item.comentario || item.texto || "—"}\n`;
      if (item.notas) {
        text += `      • Notas: ${item.notas}\n`;
      }
      if (item.respuesta) {
        text += `      • Respuesta / Plan: ${item.respuesta}\n`;
      }
      text += `\n`;
    });
    text += `\n`;
  });

  text += `Generado automáticamente por el Sistema PMO.\n`;
  return text;
}

export const CommentsView = memo(function CommentsView({
  projects = [],
  portfolioName = "",
  onUpdateProject
}) {
  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [selectedStatus, setSelectedStatus] = useState("TODOS");
  const [searchQuery, setSearchQuery] = useState("");

  // Copy feedback states
  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState(null);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    proyectoId: "",
    restriccion: "Suministro",
    comentario: "",
    responsable: "PMO Team",
    estado: "En curso",
    notas: "",
    respuesta: ""
  });

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState(null);

  // Currently selected project object
  const selectedProjectObj = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Flatten all comments/restrictions from all projects with parent project info
  const allRestrictions = useMemo(() => {
    const list = [];
    projects.forEach((proj) => {
      const comments = proj.comments || [];
      comments.forEach((c) => {
        list.push({
          ...c,
          proyectoId: proj.id,
          proyectoNombre: proj.name,
          proyectoManager: proj.manager || "Sin responsable",
          rawProject: proj
        });
      });
    });
    // Active first, completed last. Within each group sort by date descending (most recent first)
    return list.sort((a, b) => {
      const aDone = isCommentCompleted(a) ? 1 : 0;
      const bDone = isCommentCompleted(b) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return new Date(b.fecha || 0) - new Date(a.fecha || 0);
    });
  }, [projects]);

  // List of active/unresolved restrictions
  const unresolvedRestrictions = useMemo(() => {
    return allRestrictions.filter((item) => !isCommentCompleted(item));
  }, [allRestrictions]);

  // Unresolved restrictions specifically for the selected project
  const selectedProjectUnresolved = useMemo(() => {
    if (!selectedProjectId) return [];
    return unresolvedRestrictions.filter((i) => i.proyectoId === selectedProjectId);
  }, [unresolvedRestrictions, selectedProjectId]);

  // Projects map with their unresolved comments
  const projectUnresolvedMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      const unres = (p.comments || []).filter((c) => !isCommentCompleted(c));
      map[p.id] = {
        project: p,
        unresolved: unres
      };
    });
    return map;
  }, [projects]);

  // Filtered list (retains active-first sorting)
  const filteredRestrictions = useMemo(() => {
    return allRestrictions.filter((item) => {
      if (selectedProjectId && item.proyectoId !== selectedProjectId) return false;
      if (selectedCategory !== "TODAS" && item.restriccion !== selectedCategory) return false;
      if (selectedStatus !== "TODOS") {
        if (selectedStatus === "Activa" && isCommentCompleted(item)) return false;
        if (selectedStatus === "Completada" && !isCommentCompleted(item)) return false;
        if (selectedStatus !== "Activa" && selectedStatus !== "Completada" && item.estado !== selectedStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inProj = item.proyectoNombre.toLowerCase().includes(q);
        const inCat = (item.restriccion || "").toLowerCase().includes(q);
        const inCom = (item.comentario || "").toLowerCase().includes(q);
        const inResp = (item.responsable || "").toLowerCase().includes(q);
        const inNot = (item.notas || "").toLowerCase().includes(q);
        const inAns = (item.respuesta || "").toLowerCase().includes(q);
        if (!inProj && !inCat && !inCom && !inResp && !inNot && !inAns) {
          return false;
        }
      }
      return true;
    });
  }, [allRestrictions, selectedProjectId, selectedCategory, selectedStatus, searchQuery]);

  // Metrics for KPIs
  const stats = useMemo(() => {
    const total = allRestrictions.length;
    let activas = 0;
    let completadas = 0;
    let enRevision = 0;
    let pendiente = 0;
    let enCurso = 0;

    allRestrictions.forEach((item) => {
      if (isCommentCompleted(item)) {
        completadas++;
      } else {
        activas++;
        const st = (item.estado || "").toLowerCase();
        if (st.includes("revis")) enRevision++;
        else if (st.includes("pendient")) pendiente++;
        else enCurso++;
      }
    });

    return { total, activas, completadas, enRevision, pendiente, enCurso };
  }, [allRestrictions]);

  // Download a single project .txt helper
  const downloadSingleProjectTxt = useCallback((project, items) => {
    const textContent = generateProjectUnresolvedText(
      project.name,
      project.manager,
      portfolioName,
      items
    );
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const nowStr = new Date().toISOString().slice(0, 10);
    a.download = `Novedades_${safeName}_${nowStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [portfolioName]);

  // Copy a single project's text to clipboard
  const handleCopyProjectText = useCallback(async (project, items) => {
    const textContent = generateProjectUnresolvedText(
      project.name,
      project.manager,
      portfolioName,
      items
    );
    try {
      await navigator.clipboard.writeText(textContent);
      setCopiedProjectId(project.id);
      setTimeout(() => setCopiedProjectId(null), 2500);
    } catch (err) {
      console.error("Error al copiar texto:", err);
    }
  }, [portfolioName]);

  // Download ALL projects as individual .txt files
  const handleDownloadAllProjectsIndividual = useCallback(() => {
    const projectsWithItems = Object.values(projectUnresolvedMap).filter(
      (entry) => entry.unresolved.length > 0
    );

    if (projectsWithItems.length === 0) return;

    projectsWithItems.forEach(({ project, unresolved }, idx) => {
      setTimeout(() => {
        downloadSingleProjectTxt(project, unresolved);
      }, idx * 250);
    });
  }, [projectUnresolvedMap, downloadSingleProjectTxt]);

  // Download consolidated .txt (unused – kept for future button)
  const _handleDownloadConsolidatedTxt = useCallback(() => {
    const textContent = generateConsolidatedUnresolvedText(
      unresolvedRestrictions,
      portfolioName
    );
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nowStr = new Date().toISOString().slice(0, 10);
    a.download = `Novedades_Consolidado_PMO_${nowStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [unresolvedRestrictions, portfolioName]);

  // Copy consolidated text
  const handleCopyConsolidatedText = useCallback(async () => {
    const textContent = generateConsolidatedUnresolvedText(
      unresolvedRestrictions,
      portfolioName
    );
    try {
      await navigator.clipboard.writeText(textContent);
      setCopiedGeneral(true);
      setTimeout(() => setCopiedGeneral(false), 2500);
    } catch (err) {
      console.error("Error al copiar texto:", err);
    }
  }, [unresolvedRestrictions, portfolioName]);

  // Open modal for new restriction
  const handleOpenCreateModal = useCallback((preselectedProjId = "") => {
    const defaultProjId = preselectedProjId || selectedProjectId || projects[0]?.id || "";
    setEditingItem(null);
    setFormData({
      proyectoId: defaultProjId,
      restriccion: "Suministro",
      comentario: "",
      responsable: localStorage.getItem("pmo_comment_author") || "PMO Team",
      estado: "Activa",
      notas: "",
      respuesta: ""
    });
    setIsModalOpen(true);
  }, [selectedProjectId, projects]);

  // Open modal for editing existing restriction
  const handleOpenEditModal = useCallback((item) => {
    setEditingItem(item);
    setFormData({
      proyectoId: item.proyectoId,
      restriccion: item.restriccion || "Suministro",
      comentario: item.comentario || "",
      responsable: item.responsable || "PMO Team",
      estado: item.estado || "En curso",
      notas: item.notas || "",
      respuesta: item.respuesta || ""
    });
    setIsModalOpen(true);
  }, []);

  // Save form data (Create or Update)
  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.proyectoId || !formData.comentario.trim()) return;

    const targetProject = projects.find((p) => p.id === formData.proyectoId);
    if (!targetProject) return;

    // Save author preference to localStorage
    if (formData.responsable) {
      localStorage.setItem("pmo_comment_author", formData.responsable.trim());
    }

    if (editingItem) {
      // Case 1: Editing within same project
      if (editingItem.proyectoId === formData.proyectoId) {
        const updatedComments = (targetProject.comments || []).map((c) => {
          if (c.id === editingItem.id) {
            return {
              ...c,
              restriccion: formData.restriccion,
              comentario: formData.comentario.trim(),
              texto: formData.comentario.trim(),
              responsable: formData.responsable.trim() || "PMO Team",
              autor: formData.responsable.trim() || "PMO Team",
              estado: formData.estado,
              notas: formData.notas.trim(),
              respuesta: formData.respuesta.trim(),
              fechaUltimaEdicion: new Date().toISOString()
            };
          }
          return c;
        });

        onUpdateProject({
          ...targetProject,
          comments: updatedComments
        });
      } else {
        // Case 2: Project changed - remove from old project and add to new project
        const oldProject = projects.find((p) => p.id === editingItem.proyectoId);
        if (oldProject) {
          const oldUpdated = (oldProject.comments || []).filter((c) => c.id !== editingItem.id);
          onUpdateProject({ ...oldProject, comments: oldUpdated });
        }

        const newItem = {
          id: editingItem.id,
          proyectoId: formData.proyectoId,
          restriccion: formData.restriccion,
          comentario: formData.comentario.trim(),
          texto: formData.comentario.trim(),
          responsable: formData.responsable.trim() || "PMO Team",
          autor: formData.responsable.trim() || "PMO Team",
          estado: formData.estado,
          notas: formData.notas.trim(),
          respuesta: formData.respuesta.trim(),
          fecha: editingItem.fecha || new Date().toISOString(),
          fechaUltimaEdicion: new Date().toISOString()
        };

        const newTargetUpdated = [newItem, ...(targetProject.comments || [])];
        onUpdateProject({ ...targetProject, comments: newTargetUpdated });
      }
    } else {
      // Creating new comment
      const newComment = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        proyectoId: targetProject.id,
        restriccion: formData.restriccion,
        comentario: formData.comentario.trim(),
        texto: formData.comentario.trim(),
        responsable: formData.responsable.trim() || "PMO Team",
        autor: formData.responsable.trim() || "PMO Team",
        estado: formData.estado,
        notas: formData.notas.trim(),
        respuesta: formData.respuesta.trim(),
        fecha: new Date().toISOString(),
        fechaUltimaEdicion: null
      };

      const updatedComments = [newComment, ...(targetProject.comments || [])];
      onUpdateProject({
        ...targetProject,
        comments: updatedComments
      });
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Delete handler
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const targetProject = projects.find((p) => p.id === itemToDelete.proyectoId);
    if (targetProject) {
      const updatedComments = (targetProject.comments || []).filter(
        (c) => c.id !== itemToDelete.id
      );
      onUpdateProject({
        ...targetProject,
        comments: updatedComments
      });
    }
    setItemToDelete(null);
  };

  // Quick inline status updater
  const handleQuickStatusChange = (item, newStatus) => {
    const targetProject = projects.find((p) => p.id === item.proyectoId);
    if (!targetProject) return;

    const updatedComments = (targetProject.comments || []).map((c) => {
      if (c.id === item.id) {
        return {
          ...c,
          estado: newStatus,
          fechaUltimaEdicion: new Date().toISOString()
        };
      }
      return c;
    });

    onUpdateProject({
      ...targetProject,
      comments: updatedComments
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="glass-card rounded-2xl border border-slate-200/80 p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded-xl bg-navy text-lemony shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">
              Total Registros
            </span>
            <span className="text-lg font-black text-navy leading-tight">
              {stats.total}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
            <Clock3 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block leading-none">
              Novedades Activas
            </span>
            <span className="text-lg font-black text-emerald-950 leading-tight">
              {stats.activas}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block leading-none">
              En Revisión
            </span>
            <span className="text-lg font-black text-amber-950 leading-tight">
              {stats.enRevision}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-rose-200/80 bg-rose-50/40 p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block leading-none">
              Pendientes
            </span>
            <span className="text-lg font-black text-rose-950 leading-tight">
              {stats.pendiente}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex items-center gap-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="p-2 rounded-xl bg-slate-600 text-white shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-none">
              Completadas
            </span>
            <span className="text-lg font-black text-slate-800 leading-tight">
              {stats.completadas}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Filter, Search, Export Individual TXT, and + Nueva Novedad */}
      <div className="glass-card rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Context */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-navy text-lemony">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-navy leading-none">
                Observaciones y Novedades de Gestión
              </h2>
              <span className="text-[11px] text-slate-400">
                {selectedProjectObj
                  ? `Viendo novedades de: ${selectedProjectObj.name}`
                  : "Matriz de Restricciones y Seguimiento de Proyectos"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* If a project is selected: Export that specific project */}
            {selectedProjectObj ? (
              <>
                {/* Copy for Chat (Selected Project) */}
                <button
                  type="button"
                  onClick={() =>
                    handleCopyProjectText(
                      selectedProjectObj,
                      projectUnresolvedMap[selectedProjectObj.id]?.unresolved || []
                    )
                  }
                  disabled={selectedProjectUnresolved.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    copiedProjectId === selectedProjectObj.id
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : selectedProjectUnresolved.length > 0
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs card-hover"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                  title={`Copiar novedades de ${selectedProjectObj.name} con formato listo para Chat`}
                >
                  {copiedProjectId === selectedProjectObj.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-black">¡Copiado para Chat!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Chat ({selectedProjectObj.name})</span>
                    </>
                  )}
                </button>

                {/* Download TXT (Selected Project) */}
                <button
                  type="button"
                  onClick={() =>
                    downloadSingleProjectTxt(
                      selectedProjectObj,
                      projectUnresolvedMap[selectedProjectObj.id]?.unresolved || []
                    )
                  }
                  disabled={selectedProjectUnresolved.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedProjectUnresolved.length > 0
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs card-hover"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                  title={`Descargar archivo .txt individual de ${selectedProjectObj.name}`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Descargar .TXT ({selectedProjectObj.name})</span>
                </button>
              </>
            ) : (
              /* If viewing ALL projects: provide individual downloads and consolidated copy */
              <>
                {/* Download individual .txt per project */}
                <button
                  type="button"
                  onClick={handleDownloadAllProjectsIndividual}
                  disabled={unresolvedRestrictions.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    unresolvedRestrictions.length > 0
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs card-hover"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                  title="Descarga un archivo .txt independiente por cada proyecto que tenga novedades activas"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Descargar .TXT (1 archivo por proyecto)</span>
                </button>

                {/* Copy for Chat (Consolidated) */}
                <button
                  type="button"
                  onClick={handleCopyConsolidatedText}
                  disabled={unresolvedRestrictions.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    copiedGeneral
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : unresolvedRestrictions.length > 0
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs card-hover"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                  title="Copiar todas las novedades activas al portapapeles con formato para chat"
                >
                  {copiedGeneral ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-black">¡Copiado para Chat!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Chat (Todos)</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* New Observation Button */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-navy text-lemony hover:bg-navy-dark shadow-xs transition-all cursor-pointer card-hover"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nueva Observación</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 min-w-max">Proyecto:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">— Todos los Proyectos —</option>
              {projects.map((p) => {
                const unresCount = (p.comments || []).filter(
                  (c) => c.estado !== "Resuelto" && c.estado !== "Cerrado"
                ).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({unresCount} activas)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Restriction Category Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 min-w-max">Restricción:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
            >
              <option value="TODAS">— Todas las Categorías —</option>
              {RESTRICTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 min-w-max">Estado:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
            >
              <option value="TODOS">— Todos los Estados —</option>
              {RESTRICTION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en observaciones, notas, responsable..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Restrictions & Observations Table */}
      <div className="glass-card rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-navy text-white text-[12px] font-semibold sticky top-0 z-10 shadow-xs select-none">
              <tr>
                <th className="py-3 px-3.5 w-[170px]">PROYECTO</th>
                <th className="py-3 px-3 w-[120px]">RESTRICCIÓN</th>
                <th className="py-3 px-3.5 min-w-[200px]">Comentario</th>
                <th className="py-3 px-3 w-[130px]">RESPONSABLE</th>
                <th className="py-3 px-3 w-[110px] text-center">Estado</th>
                <th className="py-3 px-3 min-w-[180px]">Notas</th>
                <th className="py-3 px-3 min-w-[180px]">Respuesta</th>
                <th className="py-3 px-3 w-[90px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRestrictions.length > 0 ? (
                filteredRestrictions.map((item, idx) => {
                  const completed = isCommentCompleted(item);
                  const catStyle =
                    RESTRICTION_STYLES[item.restriccion] || RESTRICTION_STYLES.General;
                  const statusStyle =
                    STATUS_STYLES[item.estado] || (completed ? STATUS_STYLES["Completada"] : STATUS_STYLES["Activa"]);

                  const projectEntry = projectUnresolvedMap[item.proyectoId];
                  const projectUnresolvedItems = projectEntry ? projectEntry.unresolved : [];

                  return (
                    <tr
                      key={item.id}
                      className={`${
                        completed
                          ? "bg-slate-100/60 opacity-65 hover:opacity-100 hover:bg-slate-100/90"
                          : idx % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/50"
                      } hover:bg-slate-100/80 transition-all group`}
                    >
                      {/* 1. PROYECTO + Quick per-project export buttons */}
                      <td className="p-3 border-r border-slate-200/60 align-top">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(item.proyectoId)}
                            className="text-left font-bold text-navy hover:text-nashville transition-colors leading-tight cursor-pointer"
                            title="Filtrar por este proyecto"
                          >
                            {item.proyectoNombre}
                          </button>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(item.fecha)}
                          </span>

                          {/* Quick Export per project icons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyProjectText(
                                  item.rawProject || { name: item.proyectoNombre, id: item.proyectoId, manager: item.proyectoManager },
                                  projectUnresolvedItems
                                );
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                                copiedProjectId === item.proyectoId
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                              }`}
                              title={`Copiar para chat las novedades de ${item.proyectoNombre}`}
                            >
                              {copiedProjectId === item.proyectoId ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Chat</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadSingleProjectTxt(
                                  item.rawProject || { name: item.proyectoNombre, id: item.proyectoId, manager: item.proyectoManager },
                                  projectUnresolvedItems
                                );
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                              title={`Descargar .txt individual de ${item.proyectoNombre}`}
                            >
                              <Download className="w-2.5 h-2.5" />
                              <span>.txt</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 2. RESTRICCIÓN */}
                      <td className="p-3 border-r border-slate-200/60 align-top">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-2xs ${catStyle}`}
                        >
                          {item.restriccion || "Suministro"}
                        </span>
                      </td>

                      {/* 3. COMENTARIO */}
                      <td className="p-3 border-r border-slate-200/60 align-top">
                        <p className={`leading-relaxed whitespace-pre-wrap ${completed ? "text-slate-500 line-through decoration-slate-300 font-normal italic" : "text-slate-800 font-medium"}`}>
                          {item.comentario || item.texto || "—"}
                        </p>
                      </td>

                      {/* 4. RESPONSABLE */}
                      <td className="p-3 border-r border-slate-200/60 align-top">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {item.responsable ? item.responsable.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="font-bold text-slate-700 truncate" title={item.responsable}>
                            {item.responsable || "PMO Team"}
                          </span>
                        </div>
                      </td>

                      {/* 5. ESTADO (With 1-click toggle between Activa & Completada) */}
                      <td className="p-3 border-r border-slate-200/60 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(item, completed ? "Activa" : "Completada")}
                            className={`p-1 rounded-lg border transition-all cursor-pointer ${
                              completed
                                ? "bg-slate-200 text-slate-700 border-slate-300 hover:bg-emerald-100 hover:text-emerald-800"
                                : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-slate-100 hover:text-slate-600"
                            }`}
                            title={completed ? "Revertir a Activa (sube arriba)" : "Marcar como Completada (pasa al final)"}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${completed ? "text-slate-600" : "text-emerald-600"}`} />
                          </button>
                          <select
                            value={item.estado || (completed ? "Completada" : "Activa")}
                            onChange={(e) => handleQuickStatusChange(item, e.target.value)}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer focus:outline-none transition-all border-0 shadow-2xs ${statusStyle}`}
                            title="Cambiar estado"
                          >
                            {RESTRICTION_STATUSES.map((st) => (
                              <option key={st} value={st} className="bg-white text-slate-800 font-medium">
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 6. NOTAS */}
                      <td className="p-3 border-r border-slate-200/60 align-top">
                        {item.notas ? (
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/80 p-2 rounded-lg border border-slate-200/60">
                            {item.notas}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* 7. RESPUESTA */}
                      <td className="p-3 border-r border-slate-200/60 align-top">
                        {item.respuesta ? (
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/80 p-2 rounded-lg border border-slate-200/60 font-medium">
                            {item.respuesta}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* 8. ACCIONES */}
                      <td className="p-3 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar observación"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar observación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600 text-sm">
                        No se encontraron observaciones con los filtros seleccionados
                      </p>
                      <p className="text-xs text-slate-400">
                        Prueba ajustando los filtros de proyecto, restricción, estado o utiliza el botón de "+ Nueva Observación".
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal for Create / Edit Restriction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="glass-card bg-white rounded-3xl border border-slate-200 p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-navy text-lemony">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-navy leading-tight">
                    {editingItem ? "Editar Observación / Novedad" : "Nueva Observación de Gestión"}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Registro estructurado de restricciones y seguimiento
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Row 1: Project & Restriction Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Proyecto *</label>
                  <select
                    value={formData.proyectoId}
                    onChange={(e) => setFormData({ ...formData, proyectoId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="" disabled>— Selecciona un proyecto —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Restricción / Categoría *</label>
                  <select
                    value={formData.restriccion}
                    onChange={(e) => setFormData({ ...formData, restriccion: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {RESTRICTION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Comentario (Main description) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Comentario / Novedad *</label>
                <textarea
                  rows={3}
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                  placeholder="Ej: Retrasos en la llegada de insumos y transformador principal..."
                  required
                  className="w-full p-3 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Row 3: Responsable & Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Responsable</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.responsable}
                      onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                      placeholder="Nombre del responsable..."
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {RESTRICTION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Notas (Follow up questions/notes) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Notas de Seguimiento / Control</label>
                <textarea
                  rows={2}
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Ej: ¿Hay alguna novedad con los insumos faltantes? ¿Se requiere reunión con el contratista?"
                  className="w-full p-2.5 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Row 5: Respuesta (Action plan / response) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Respuesta / Plan de Acción</label>
                <textarea
                  rows={2}
                  value={formData.respuesta}
                  onChange={(e) => setFormData({ ...formData, respuesta: e.target.value })}
                  placeholder="Ej: Monitorear contrataciones y despacho terrestre desde puerto..."
                  className="w-full p-2.5 bg-white border border-slate-200 focus:border-nashville focus:ring-2 focus:ring-nashville/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.proyectoId || !formData.comentario.trim()}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
                    formData.proyectoId && formData.comentario.trim()
                      ? "bg-navy text-lemony hover:bg-navy-dark shadow-md"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingItem ? "Guardar Cambios" : "Registrar Observación"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal for Delete Confirmation */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="glass-card bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  ¿Eliminar observación?
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Esta acción eliminará de forma permanente el registro de restricción del proyecto <strong>{itemToDelete.proyectoNombre}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic line-clamp-3">
              "{itemToDelete.comentario || itemToDelete.texto}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer"
              >
                Eliminar observación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
