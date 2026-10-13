import { EQUIPMENT_TYPES } from "./equipmentConstants.js";
import { formatDate, getDaysRemaining } from "./calculations.js";
import { 
  getFullEquipmentMetrics, 
  detectEquipmentBottlenecks, 
  getEquipmentProcurementAlerts 
} from "../services/equipmentService.js";

/**
 * Extracts all notes/comments from equipment across projects in a portfolio
 */
export function getEquipmentNotes(projects = []) {
  const result = [];

  (projects || []).forEach((p) => {
    if (!p) return;
    const eqData = p.equipment || {};
    const projectNotes = [];

    EQUIPMENT_TYPES.forEach((eqType) => {
      const item = eqData[eqType.id];
      if (item && typeof item.notes === "string" && item.notes.trim()) {
        projectNotes.push({
          equipmentId: eqType.id,
          equipmentName: eqType.name,
          status: item.status || "Fabricación",
          edt: item.edt || item.etd || "",
          eta: item.eta || "",
          notes: item.notes.trim()
        });
      }
    });

    if (projectNotes.length > 0) {
      result.push({
        projectId: p.id,
        projectName: p.name || "Proyecto sin nombre",
        fpo: p.fpo || "",
        notes: projectNotes
      });
    }
  });

  return result;
}

/**
 * Gathers complete structured data for the equipment mini report
 */
export function getEquipmentReportData(projects = [], portfolioName = "") {
  const safeProjects = Array.isArray(projects) ? projects.filter(Boolean) : [];
  const metrics = getFullEquipmentMetrics(safeProjects);
  const bottlenecksByProject = safeProjects
    .map((p) => ({
      projectId: p.id,
      projectName: p.name || "Sin nombre",
      fpo: p.fpo || "",
      connectionState: p.connectionState || "",
      bottlenecks: detectEquipmentBottlenecks(p)
    }))
    .filter((item) => item.bottlenecks.length > 0);

  const procurementAlerts = getEquipmentProcurementAlerts(safeProjects);
  const equipmentNotes = getEquipmentNotes(safeProjects);

  // Status of ALL equipments for EVERY project
  const allProjectsEquipment = safeProjects.map((p, idx) => {
    const eqData = p.equipment || {};
    const items = EQUIPMENT_TYPES.map((eqType) => {
      const item = eqData[eqType.id] || {};
      return {
        id: eqType.id,
        name: eqType.name,
        fullName: eqType.fullName,
        status: item.status || "Fabricación",
        edt: item.edt || item.etd || "",
        eta: item.eta || "",
        brand: item.brand || "",
        notes: (item.notes || "").trim()
      };
    });

    const bottlenecks = detectEquipmentBottlenecks(p);

    return {
      index: idx + 1,
      projectId: p.id,
      projectName: p.name || "Proyecto sin nombre",
      fpo: p.fpo || "",
      connectionState: p.connectionState || "",
      manager: p.manager || "",
      items,
      bottlenecks
    };
  });

  // Overall totals
  let totalEquipments = 0;
  let totalOnSite = 0;
  let totalDelayed = 0;
  let totalInTransit = 0;
  let totalInManufacture = 0;

  metrics.forEach(({ summary }) => {
    totalEquipments += summary.total;
    totalOnSite += summary.enSitio;
    totalDelayed += summary.retrasado;
    totalInTransit += summary.enTransito + summary.enNacionalizacion;
    totalInManufacture += summary.fabricacion;
  });

  const totalBottlenecks = bottlenecksByProject.reduce(
    (acc, cur) => acc + cur.bottlenecks.length,
    0
  );

  return {
    portfolioName: portfolioName || "Portafolio General",
    projectCount: safeProjects.length,
    metrics,
    totals: {
      totalEquipments,
      totalOnSite,
      totalDelayed,
      totalInTransit,
      totalInManufacture,
      overallPercentageOnSite: totalEquipments > 0 
        ? Number(((totalOnSite / totalEquipments) * 100).toFixed(1)) 
        : 0
    },
    allProjectsEquipment,
    bottlenecksByProject,
    totalBottlenecks,
    procurementAlerts,
    equipmentNotes,
    totalNotesCount: equipmentNotes.reduce((acc, cur) => acc + cur.notes.length, 0)
  };
}

/**
 * Generates an executive clean text report formatted for WhatsApp, Teams, Email, or Slack
 */
export function generateEquipmentReportText(projects = [], portfolioName = "") {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const data = getEquipmentReportData(projects, portfolioName);
  const { projectCount, allProjectsEquipment } = data;

  const header = portfolioName ? `📦 *${portfolioName}*` : "📦 *Equipos*";
  let text = `${header} — ${dateFormatted}\n`;
  text += `${projectCount} proyecto${projectCount !== 1 ? "s" : ""} monitoreados\n\n`;

  if (projectCount === 0) {
    text += `Sin proyectos registrados.\n`;
    return text;
  }

  allProjectsEquipment.forEach((p) => {
    const fpoStr = p.fpo ? ` · FPO: ${formatDate(p.fpo)}` : "";
    const connStr = p.connectionState ? ` · ${p.connectionState}` : "";
    text += `*${p.projectName}*${fpoStr}${connStr}\n`;

    p.items.forEach((item) => {
      const isDelayed = item.status.toLowerCase().includes("retrasad");
      const isUnordered =
        item.status.toLowerCase().includes("no pedido") ||
        item.status.toLowerCase().includes("pendiente oc");
      const alert = isDelayed || isUnordered ? " ⚠️" : "";

      let datePart = "";
      if (item.eta) datePart = ` · ETA: ${formatDate(item.eta)}`;
      else if (item.edt) datePart = ` · EDT: ${formatDate(item.edt)}`;

      text += `  · ${item.name}: ${item.status}${datePart}${alert}\n`;
      if (item.notes) {
        text += `    💬 ${item.notes}\n`;
      }
    });

    text += "\n";
  });

  text += `_PMO Control Tracker_`;

  return text;
}
