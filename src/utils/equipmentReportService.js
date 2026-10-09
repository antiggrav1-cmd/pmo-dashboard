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
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const data = getEquipmentReportData(projects, portfolioName);
  const { 
    projectCount, 
    totals, 
    metrics, 
    allProjectsEquipment,
    bottlenecksByProject, 
    procurementAlerts, 
    equipmentNotes 
  } = data;

  let text = `📦 INFORME DE ESTADO DE EQUIPOS POR PROYECTO\n`;
  text += `Portafolio: ${portfolioName || "General"}\n`;
  text += `Fecha de corte: ${dateFormatted}\n`;
  text += `Proyectos monitoreados: ${projectCount}\n`;
  text += `${"═".repeat(50)}\n\n`;

  if (projectCount === 0) {
    text += `ℹ️ No hay proyectos registrados en este portafolio.\n`;
    return text;
  }

  // ESTADO DETALLADO DE EQUIPOS POR PROYECTO
  text += `ESTADO DETALLADO DE EQUIPOS POR PROYECTO:\n\n`;
  allProjectsEquipment.forEach((p) => {
    const fpoStr = p.fpo ? ` | FPO: ${formatDate(p.fpo)}` : "";
    const connStr = p.connectionState ? ` | Red: ${p.connectionState}` : "";
    text += `${p.index}. ${p.projectName}${fpoStr}${connStr}\n`;

    p.items.forEach((item) => {
      let dates = "";
      if (item.edt || item.eta) {
        dates = ` (${[item.edt ? `EDT: ${formatDate(item.edt)}` : "", item.eta ? `ETA: ${formatDate(item.eta)}` : ""].filter(Boolean).join(" | ")})`;
      }
      let alertMark = "";
      const isDelayed = item.status.toLowerCase().includes("retrasad");
      const isUnordered = item.status.toLowerCase().includes("no pedido") || item.status.toLowerCase().includes("pendiente oc");
      if (isDelayed) alertMark = " ⚠️";
      else if (isUnordered) alertMark = " ⚠️";

      text += `   • ${item.name}: ${item.status}${dates}${alertMark}\n`;
      if (item.notes) {
        text += `     ↳ 💬 Nota [${item.name}]: "${item.notes}"\n`;
      }
    });
    text += `\n`;
  });

  text += `${"═".repeat(50)}\n`;
  text += `Generado automáticamente por PMO Control Tracker\n`;

  return text;
}
