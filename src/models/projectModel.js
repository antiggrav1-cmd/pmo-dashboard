import { calculateGap, determineStatus } from "../utils/calculations";
import { getDefaultEquipment } from "../utils/equipmentConstants";

/**
 * Default standard payment milestones matching PMO billing structure
 */
export function getDefaultPaymentMilestones() {
  return [
    { id: "hm-1", name: "Anticipo equipos", percentageCop: 0, percentageUsd: 0, valueCop: 0, valueUsd: 24000, status: "Cobrado", submittedAt: "" },
    { id: "hm-2", name: "Hito Anticipo", percentageCop: 0, percentageUsd: 0, valueCop: 0, valueUsd: 82631, status: "Cobrado", submittedAt: "" },
    { id: "hm-3", name: "Ingeniería de detalle", percentageCop: 0, percentageUsd: 0, valueCop: 422332090, valueUsd: 53315, status: "Cobrado", submittedAt: "" },
    { id: "hm-4", name: "Hito salida de equipos y restante COP", percentageCop: 0, percentageUsd: 0, valueCop: 211166045, valueUsd: 106631, status: "Cobrado", submittedAt: "" },
    { id: "hm-5", name: "Hito llegada de equipos", percentageCop: 0, percentageUsd: 0, valueCop: 316749067, valueUsd: 0, status: "Cobrado", submittedAt: "" },
    { id: "hm-6", name: "Hito instalación", percentageCop: 0, percentageUsd: 0, valueCop: 79187267, valueUsd: 0, status: "Por cobrar", submittedAt: "" },
  ];
}

/**
 * Normalizes payment milestones array
 */
export function normalizePaymentMilestones(milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return getDefaultPaymentMilestones();
  }
  return milestones.map((m, idx) => {
    let st = m.status ? String(m.status).trim() : "Por cobrar";
    const stLower = st.toLowerCase();
    if (stLower === "pendiente" || stLower === "facturado") {
      st = "Por cobrar";
    } else if (stLower.includes("cobrad")) {
      st = "Cobrado";
    } else if (stLower.includes("saldo pendiente")) {
      st = "Saldo Pendiente";
    } else if (stLower.includes("trámite") || stLower.includes("tramite")) {
      st = "En trámite";
    } else if (stLower.includes("por cobrar")) {
      st = "Por cobrar";
    }

    const valCop = m.valueCop !== undefined && m.valueCop !== "" ? Number(m.valueCop) || 0 : 0;
    const valUsd = m.valueUsd !== undefined && m.valueUsd !== "" ? Number(m.valueUsd) || 0 : 0;

    return {
      id: m.id || `hm-${Date.now()}-${idx}`,
      name: m.name ? String(m.name).trim() : `Hito ${idx + 1}`,
      valueCop: valCop,
      valueUsd: valUsd,
      percentageCop: m.percentageCop !== undefined && m.percentageCop !== "" ? Number(m.percentageCop) || 0 : 0,
      percentageUsd: m.percentageUsd !== undefined && m.percentageUsd !== "" ? Number(m.percentageUsd) || 0 : 0,
      saldoPendienteCop: m.saldoPendienteCop !== undefined && m.saldoPendienteCop !== "" ? Number(m.saldoPendienteCop) : (st === "Saldo Pendiente" ? valCop : undefined),
      saldoPendienteUsd: m.saldoPendienteUsd !== undefined && m.saldoPendienteUsd !== "" ? Number(m.saldoPendienteUsd) : (st === "Saldo Pendiente" ? valUsd : undefined),
      status: st,
      submittedAt: m.submittedAt ? String(m.submittedAt).trim() : ""
    };
  });
}

/**
 * Project connection states
 */
export const CONNECTION_STATES = ["DD", "Ingeniería", "Montaje", "Energizado", "Entregado"];

/**
 * Creates a clean Project entity with normalized defaults
 */
export function createProject(data = {}) {
  const real = data.realProgress !== undefined ? Number(data.realProgress) || 0 : 0;
  const sched = data.scheduledProgress !== undefined ? Number(data.scheduledProgress) || 0 : 0;
  const gap = data.gap !== undefined ? Number(data.gap) : calculateGap(real, sched);
  const connState = data.connectionState || (data.gridConnected ? "Energizado" : "Ingeniería");

  return {
    id: data.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    xm: data.xm ? String(data.xm).trim() : "",
    xmUrl: data.xmUrl ? String(data.xmUrl).trim() : "",
    name: data.name ? String(data.name).trim() : "Nuevo Proyecto",
    fpo: data.fpo ? String(data.fpo).trim() : "",
    cod: data.cod ? String(data.cod).trim() : "",
    creg: data.creg ? String(data.creg).trim() : "",
    connectionState: connState, // "Montaje" | "Energizado" | "Entregado"
    gridConnected: connState === "Energizado" || connState === "Entregado" || Boolean(data.gridConnected),
    gridConnectionDate: data.gridConnectionDate ? String(data.gridConnectionDate).trim() : "",
    capexCop: data.capexCop !== undefined ? Number(data.capexCop) || 0 : 0,
    capexUsd: data.capexUsd !== undefined ? Number(data.capexUsd) || 0 : 0,
    trmProyecto: data.trmProyecto !== undefined ? Number(data.trmProyecto) || 0 : 0,
    bacCOP: data.bacCOP !== undefined ? Number(data.bacCOP) || 0 : 0,
    bacUSD: data.bacUSD !== undefined ? Number(data.bacUSD) || 0 : 0,
    acCOP: data.acCOP !== undefined ? Number(data.acCOP) || 0 : 0,
    acUSD: data.acUSD !== undefined ? Number(data.acUSD) || 0 : 0,
    cpiAnterior: data.cpiAnterior !== undefined ? Number(data.cpiAnterior) || 0 : 0,
    realProgress: real,
    scheduledProgress: sched,
    gap: gap,
    previousGap: data.previousGap !== undefined ? Number(data.previousGap) : gap,
    status: determineStatus(gap, real),
    notes: data.notes ? String(data.notes).trim() : "",
    manager: data.manager ? String(data.manager).trim() : "",
    residenteCivil: data.residenteCivil ? String(data.residenteCivil).trim() : "",
    residenteElectrico: data.residenteElectrico ? String(data.residenteElectrico).trim() : "",
    operadorRed: data.operadorRed ? String(data.operadorRed).trim() : (data.operator ? String(data.operator).trim() : ""),
    equipment: normalizeEquipment(data.equipment),
    paymentMilestones: normalizePaymentMilestones(data.paymentMilestones),
    comments: normalizeComments(data.comments, data.id)
  };
}

/**
 * Default restriction categories and statuses
 */
export const RESTRICTION_CATEGORIES = [
  "Suministro",
  "Diseño",
  "Logística",
  "Calidad",
  "OR/CREG",
  "Contratista",
  "SST",
  "Financiera",
  "Montaje",
  "DD"
];

export const RESTRICTION_STATUSES = [
  "Activa",
  "Completada",
  "En curso",
  "En revisión",
  "Pendiente"
];

/**
 * Checks whether a comment or restriction is in completed state
 */
export function isCommentCompleted(comment) {
  if (!comment) return false;
  const s = String(comment.estado || "").toLowerCase().trim();
  return s === "completada" || s === "completado" || s === "resuelto" || s === "cerrado";
}

/**
 * Normalizes project comments / restrictions list
 */
export function normalizeComments(commentsData, projectId = "") {
  if (!Array.isArray(commentsData)) return [];
  return commentsData.map((c) => {
    const textContent = c.comentario || c.texto || "";
    let rawEstado = c.estado ? String(c.estado).trim() : "Activa";
    if (rawEstado.toLowerCase() === "resuelto" || rawEstado.toLowerCase() === "cerrado") {
      rawEstado = "Completada";
    }
    return {
      id: c.id || `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      proyectoId: c.proyectoId || projectId || "",
      restriccion: c.restriccion ? String(c.restriccion).trim() : "Suministro",
      comentario: textContent ? String(textContent).trim() : "",
      texto: textContent ? String(textContent).trim() : "", // backward compatibility
      responsable: c.responsable ? String(c.responsable).trim() : (c.autor ? String(c.autor).trim() : "PMO Team"),
      autor: c.responsable ? String(c.responsable).trim() : (c.autor ? String(c.autor).trim() : "PMO Team"), // backward compatibility
      estado: rawEstado,
      notas: c.notas ? String(c.notas).trim() : "",
      respuesta: c.respuesta ? String(c.respuesta).trim() : "",
      fecha: c.fecha || new Date().toISOString(),
      fechaUltimaEdicion: c.fechaUltimaEdicion || null
    };
  }).filter((c) => c.comentario !== "" || c.notas !== "" || c.respuesta !== "");
}

/**
 * Normalizes equipment structure ensuring all 5 equipment types exist
 */
export function normalizeEquipment(eqData) {
  const defaults = getDefaultEquipment();
  if (!eqData || typeof eqData !== "object") return defaults;

  const result = {};
  for (const key of Object.keys(defaults)) {
    const item = eqData[key] || {};
    result[key] = {
      status: item.status || "Fabricación",
      progress: item.progress !== undefined && item.progress !== "" ? Number(item.progress) || 0 : 0,
      eta: item.eta ? String(item.eta).trim() : "",
      brand: item.brand ? String(item.brand).trim() : "",
      notes: item.notes ? String(item.notes).trim() : ""
    };
  }
  return result;
}

/**
 * Normalizes a portfolio ensuring valid project list
 */
export function normalizePortfolio(portfolio = {}) {
  return {
    id: portfolio.id || `port-${Date.now()}`,
    name: portfolio.name ? String(portfolio.name).trim() : "Nuevo Portafolio",
    code: portfolio.code ? String(portfolio.code).trim() : "PORT-01",
    atc: portfolio.atc ? String(portfolio.atc).trim() : (portfolio.atcResponsible ? String(portfolio.atcResponsible).trim() : "Sin Asignar"),
    description: portfolio.description ? String(portfolio.description).trim() : "",
    projects: Array.isArray(portfolio.projects)
      ? portfolio.projects.map(createProject)
      : []
  };
}
