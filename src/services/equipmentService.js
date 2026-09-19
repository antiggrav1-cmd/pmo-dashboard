import { EQUIPMENT_TYPES } from "../utils/equipmentConstants";
import { formatDate, getDaysRemaining } from "../utils/calculations";

/**
 * Returns true if the equipment status is considered arrived / installed / on site
 */
export function isEquipmentOnSite(status = "") {
  const s = status.toLowerCase();
  return s.includes("sitio") || s.includes("instalad");
}

/**
 * Returns true if the equipment status indicates delay
 */
export function isEquipmentDelayed(status = "") {
  return status.toLowerCase().includes("retrasad");
}

export function isEquipmentInstalled(status = "") {
  return status.toLowerCase().includes("instalad");
}

/**
 * Returns true if the equipment is in nationalization
 */
export function isEquipmentInNationalization(status = "") {
  return status.toLowerCase().includes("nacional");
}

/**
 * Returns true if the equipment is in transit
 */
export function isEquipmentInTransit(status = "") {
  const s = status.toLowerCase();
  return s.includes("tránsito") || s.includes("transito") || s.includes("marítimo") || s.includes("terrestre");
}

/**
 * Calculates aggregated equipment statistics for a given equipment type across projects
 */
export function getEquipmentSummaryByType(projects = [], equipmentTypeId) {
  let enSitio = 0;
  let enNacionalizacion = 0;
  let enTransito = 0;
  let retrasado = 0;
  let fabricacion = 0;
  const total = projects.length;

  projects.forEach((p) => {
    const eq = (p.equipment && p.equipment[equipmentTypeId]) || {};
    const status = eq.status || "Fabricación";

    if (isEquipmentOnSite(status)) enSitio++;
    else if (isEquipmentInNationalization(status)) enNacionalizacion++;
    else if (isEquipmentInTransit(status)) enTransito++;
    else if (isEquipmentDelayed(status)) retrasado++;
    else fabricacion++;
  });

  return {
    enSitio,
    enNacionalizacion,
    enTransito,
    retrasado,
    fabricacion,
    total,
    percentageOnSite: total > 0 ? Number(((enSitio / total) * 100).toFixed(1)) : 0
  };
}

/**
 * Returns comprehensive equipment summary for all 5 equipment types
 */
export function getFullEquipmentMetrics(projects = []) {
  return EQUIPMENT_TYPES.map((type) => ({
    type,
    summary: getEquipmentSummaryByType(projects, type.id)
  }));
}

/**
 * Returns badge styling classes for a given equipment status
 */
export function getEquipmentStatusStyle(status = "") {
  const s = status.toLowerCase();
  if (s.includes("retrasad")) return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
  if (s.includes("no pedido")) return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
  if (s.includes("instalad")) return "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold";
  if (s.includes("sitio")) return "bg-teal-50 text-teal-800 border-teal-200 font-bold";
  if (s.includes("nacional")) return "bg-purple-50 text-purple-700 border-purple-200 font-semibold";
  if (s.includes("booking")) return "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold";
  if (s.includes("uf") || s.includes("espera de uf")) return "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
  if (s.includes("bt") || s.includes("espera de bt")) return "bg-orange-50 text-orange-800 border-orange-200 font-semibold";
  if (s.includes("marítimo") || s.includes("maritimo")) return "bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold";
  if (s.includes("terrestre")) return "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
  if (s.includes("fabricac")) return "bg-blue-50 text-blue-700 border-blue-200 font-medium";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

/**
 * Returns true if the equipment status is in early manufacturing/logistics stages
 */
export function isEarlySupplyStage(status = "") {
  const s = status.toLowerCase();
  return s.includes("no pedido") || 
         s.includes("pendiente oc") || 
         s.includes("fabricac") || 
         s.includes("booking") || 
         s.includes("uf") || 
         s.includes("bt") || 
         s.includes("marítimo") || 
         s.includes("maritimo");
}

/**
 * Detects logistic bottlenecks crossing equipment ETAs and status against project FPO
 */
export function detectEquipmentBottlenecks(project = {}) {
  // If project is already delivered/handed over, no equipment bottlenecks apply
  if (project.connectionState === "Entregado") {
    return [];
  }

  const fpoStr = project.fpo;
  const eqData = project.equipment || {};
  const bottlenecks = [];

  const fpoDate = fpoStr ? new Date(fpoStr) : null;
  const daysToFpo = fpoStr ? getDaysRemaining(fpoStr) : null;

  EQUIPMENT_TYPES.forEach((eqType) => {
    const item = eqData[eqType.id] || {};
    const etaStr = item.eta;
    const status = item.status || "Fabricación";
    const etaDays = etaStr ? getDaysRemaining(etaStr) : null;

    // 1. If equipment has already arrived on site or is installed, it is NOT a bottleneck
    if (isEquipmentOnSite(status)) {
      return;
    }

    // 2. Explicitly delayed status
    if (isEquipmentDelayed(status)) {
      bottlenecks.push({
        equipmentId: eqType.id,
        equipmentName: eqType.name,
        riskLevel: "CRITICAL",
        reason: `Equipo marcado explícitamente en estado "Retrasado"`,
        status,
        eta: etaStr,
        fpo: fpoStr
      });
      return;
    }

    // 3. Past Due ETA: ETA has passed (etaDays < 0) and equipment is not on site
    if (etaDays !== null && etaDays < 0) {
      bottlenecks.push({
        equipmentId: eqType.id,
        equipmentName: eqType.name,
        riskLevel: "CRITICAL",
        reason: `ETA vencida hace ${Math.abs(etaDays)} días (${formatDate(etaStr)}) y el equipo sigue en "${status}"`,
        status,
        eta: etaStr,
        fpo: fpoStr
      });
      return;
    }

    // 4. Critical Inconsistency: Imminent ETA (<= 30 days) but still in early stage (Fabricación, Buscando booking, Tránsito marítimo)
    if (etaDays !== null && etaDays >= 0 && etaDays <= 30 && isEarlySupplyStage(status)) {
      bottlenecks.push({
        equipmentId: eqType.id,
        equipmentName: eqType.name,
        riskLevel: "HIGH",
        reason: `ETA programada en ${etaDays} días pero el equipo aún figura en "${status}"`,
        status,
        eta: etaStr,
        fpo: fpoStr
      });
      return;
    }

    // 5. Direct Bottleneck: ETA arrival is later than the project's FPO (ETA > FPO)
    if (etaStr && fpoDate && !isNaN(fpoDate.getTime())) {
      const etaDate = new Date(etaStr);
      if (!isNaN(etaDate.getTime()) && etaDate > fpoDate) {
        const diffDays = Math.ceil((etaDate.getTime() - fpoDate.getTime()) / (1000 * 60 * 60 * 24));
        bottlenecks.push({
          equipmentId: eqType.id,
          equipmentName: eqType.name,
          riskLevel: "CRITICAL",
          reason: `Llegada estimada ${diffDays} días después de la FPO (${formatDate(etaStr)} vs FPO ${formatDate(fpoStr)})`,
          status,
          eta: etaStr,
          fpo: fpoStr
        });
        return;
      }
    }

    // 6. Imminent FPO Risk: FPO within 30 days and equipment still in early manufacturing/supply stage
    if (daysToFpo !== null && daysToFpo > 0 && daysToFpo <= 30 && isEarlySupplyStage(status)) {
      bottlenecks.push({
        equipmentId: eqType.id,
        equipmentName: eqType.name,
        riskLevel: "HIGH",
        reason: `Aún en "${status}" a solo ${daysToFpo} días de la FPO del proyecto`,
        status,
        eta: etaStr,
        fpo: fpoStr
      });
      return;
    }

    // 7. Not Ordered / Pending OC when FPO is within 90 days
    const isUnordered = status.toLowerCase().includes("no pedido") || status.toLowerCase().includes("pendiente oc");
    if (isUnordered && daysToFpo !== null && daysToFpo > 0 && daysToFpo <= 90) {
      bottlenecks.push({
        equipmentId: eqType.id,
        equipmentName: eqType.name,
        riskLevel: "HIGH",
        reason: `Equipo en "${status}" a solo ${daysToFpo} días de la FPO`,
        status,
        eta: etaStr,
        fpo: fpoStr
      });
      return;
    }
  });

  // 8. Installation dependency conflict: trackers must be installed before panels
  const trackers = eqData.trackers || {};
  const panels = eqData.paneles || {};
  if (isEquipmentInstalled(panels.status || "") && !isEquipmentInstalled(trackers.status || "")) {
    bottlenecks.push({
      equipmentId: "trackers",
      equipmentName: "Tracker",
      riskLevel: "CRITICAL",
      reason: "Inconsistencia física: Los paneles figuran instalados antes de que los trackers estén instalados",
      status: trackers.status || "Fabricación",
      eta: trackers.eta || "",
      fpo: fpoStr
    });
  }

  return bottlenecks;
}

/**
 * Returns all bottlenecks across a portfolio of projects
 */
export function getAllPortfolioBottlenecks(projects = []) {
  const result = [];
  projects.forEach((p) => {
    const bns = detectEquipmentBottlenecks(p);
    if (bns.length > 0) {
      result.push({
        projectId: p.id,
        projectName: p.name,
        fpo: p.fpo,
        bottlenecks: bns
      });
    }
  });
  return result;
}

/**
 * Returns all equipment items with "No pedido" or "Pendiente OC" status across all projects.
 * Triggers regardless of ETA or FPO date — any unordered or pending-PO equipment is flagged.
 */
export function getEquipmentProcurementAlerts(projects = []) {
  const alerts = [];

  projects.forEach((p) => {
    // Skip already delivered projects
    if (p.connectionState === "Entregado") return;

    const eqData = p.equipment || {};

    EQUIPMENT_TYPES.forEach((eqType) => {
      const item = eqData[eqType.id] || {};
      const status = item.status || "";
      const s = status.toLowerCase();

      const isNoPedido    = s.includes("no pedido");
      const isPendienteOC = s.includes("pendiente oc");

      if (isNoPedido || isPendienteOC) {
        alerts.push({
          projectId:     p.id,
          projectName:   p.name,
          fpo:           p.fpo,
          equipmentId:   eqType.id,
          equipmentName: eqType.fullName || eqType.name,
          status,
          eta:           item.eta || null,
          brand:         item.brand || null,
          notes:         item.notes || null,
          riskLevel:     isNoPedido ? "CRITICAL" : "WARNING",
          reason:        isNoPedido
            ? "Equipo sin orden de compra generada"
            : "Orden de compra pendiente de aprobación/emisión",
        });
      }
    });
  });

  return alerts;
}
