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

  let text = `📦 INFORME EJECUTIVO DE ESTADO DE EQUIPOS\n`;
  text += `Portafolio: ${portfolioName || "General"}\n`;
  text += `Fecha de corte: ${dateFormatted}\n`;
  text += `Proyectos monitoreados: ${projectCount}\n`;
  text += `${"═".repeat(50)}\n\n`;

  if (projectCount === 0) {
    text += `ℹ️ No hay proyectos registrados en este portafolio.\n`;
    return text;
  }

  // 1. Resumen Global
  text += `📊 1. RESUMEN GLOBAL DE SUMINISTROS:\n`;
  text += `• Total ítems de equipos: ${totals.totalEquipments}\n`;
  text += `• En sitio / instalados: ${totals.totalOnSite} (${totals.overallPercentageOnSite}%)\n`;
  text += `• En tránsito / aduana: ${totals.totalInTransit}\n`;
  text += `• En fabricación / gestión: ${totals.totalInManufacture}\n`;
  if (totals.totalDelayed > 0) {
    text += `• ⚠️ Retrasados reportados: ${totals.totalDelayed}\n`;
  }
  text += `\n`;

  // 2. Balance por tipo de equipo
  text += `⚙️ 2. BALANCE CONSOLIDADO POR EQUIPO:\n`;
  metrics.forEach(({ type, summary }) => {
    let statusMarker = "🟢";
    if (summary.retrasado > 0) statusMarker = "🔴";
    else if (summary.percentageOnSite < 50) statusMarker = "🟡";

    text += `${statusMarker} ${type.name.toUpperCase()}:\n`;
    text += `   • En sitio: ${summary.enSitio}/${summary.total} (${summary.percentageOnSite}%)\n`;
    text += `   • En ruta/tránsito: ${summary.enTransito + summary.enNacionalizacion} | Fabricación: ${summary.fabricacion}\n`;
    if (summary.retrasado > 0) {
      text += `   • ⚠️ Retrasados: ${summary.retrasado}\n`;
    }
  });
  text += `\n`;

  // 3. Estado de TODOS los Equipos por Proyecto
  text += `🏗️ 3. ESTADO DETALLADO DE EQUIPOS POR PROYECTO:\n`;
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
    });

    // Observaciones específicas de este proyecto si las hay
    const projectNotes = p.items.filter((item) => item.notes);
    if (projectNotes.length > 0) {
      projectNotes.forEach((n) => {
        text += `     ↳ Nota [${n.name}]: "${n.notes}"\n`;
      });
    }
    text += `\n`;
  });

  // 4. Alertas Críticas y Cuellos de Botella Logísticos
  text += `🚨 4. ALERTAS Y CUELLOS DE BOTELLA LOGÍSTICOS:\n`;
  if (bottlenecksByProject.length === 0 && procurementAlerts.length === 0) {
    text += `✅ Sin alertas ni cuellos de botella detectados en la cadena de suministro.\n\n`;
  } else {
    bottlenecksByProject.forEach((proj) => {
      text += `📍 ${proj.projectName} (FPO: ${formatDate(proj.fpo)}):\n`;
      proj.bottlenecks.forEach((b) => {
        const riskEmoji = b.riskLevel === "CRITICAL" ? "🔴" : b.riskLevel === "HIGH" ? "🟠" : "🟡";
        text += `   ${riskEmoji} [${b.equipmentName}]: ${b.reason}\n`;
        text += `      Estado: ${b.status}`;
        if (b.edt) text += ` | EDT: ${formatDate(b.edt)}`;
        if (b.eta) text += ` | ETA: ${formatDate(b.eta)}`;
        text += `\n`;
      });
    });

    if (procurementAlerts.length > 0) {
      text += `\n📋 Equipos sin orden de compra emitida / No pedido:\n`;
      procurementAlerts.forEach((pa) => {
        text += `   ⚠️ ${pa.projectName} - ${pa.equipmentName}: Estado "${pa.status}" (${pa.reason})\n`;
      });
    }
    text += `\n`;
  }

  // 5. Comentarios y Observaciones de Equipos
  text += `💬 5. RESUMEN CONSOLIDADO DE OBSERVACIONES:\n`;
  if (equipmentNotes.length === 0) {
    text += `ℹ️ No hay observaciones adicionales registradas en los equipos para este corte.\n`;
  } else {
    equipmentNotes.forEach((proj) => {
      text += `📌 ${proj.projectName}:\n`;
      proj.notes.forEach((n) => {
        let dateInfo = "";
        if (n.edt || n.eta) {
          dateInfo = ` (${[n.edt ? `EDT: ${formatDate(n.edt)}` : "", n.eta ? `ETA: ${formatDate(n.eta)}` : ""].filter(Boolean).join(" | ")})`;
        }
        text += `   • [${n.equipmentName}] - Estado: ${n.status}${dateInfo}:\n`;
        text += `     "${n.notes}"\n`;
      });
    });
  }

  text += `\n${"═".repeat(50)}\n`;
  text += `Generado automáticamente por PMO Control Tracker\n`;

  return text;
}
