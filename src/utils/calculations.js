/**
 * Calculates GAP percentage: Real Progress - Scheduled Progress
 * Returns rounded to 2 decimal places
 */
export function calculateGap(realProgress, scheduledProgress) {
  const real = parseFloat(realProgress) || 0;
  const scheduled = parseFloat(scheduledProgress) || 0;
  return Number((real - scheduled).toFixed(2));
}

/**
 * Calculates automatic status based on GAP and Real Progress
 */
export function determineStatus(gap, realProgress = null) {
  if (realProgress !== null && parseFloat(realProgress) >= 100) {
    return "Completado";
  }
  const g = parseFloat(gap);
  if (isNaN(g)) return "En tiempo";
  if (g < -15) return "Atrasado Crítico";
  if (g < -5) return "Rezago Leve";
  if (g > 5) return "Adelantado";
  return "En tiempo";
}

/**
 * Formats a date string to display DD/MM/YYYY
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  if (typeof dateStr === "string" && dateStr.includes("/")) {
    return dateStr;
  }
  try {
    const isoMatch = typeof dateStr === "string" && dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = isoMatch
      ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
      : new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats ISO date for input[type="date"]
 */
export function toInputDateFormat(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return "";
}

/**
 * Formats a numeric value into Colombian Pesos (COP) currency string
 */
export function formatCurrencyCop(value) {
  if (value === undefined || value === null || value === "") return "$0";
  const num = Number(value);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Formats a numeric value into US Dollars (USD) currency string
 */
export function formatCurrencyUsd(value) {
  if (value === undefined || value === null || value === "") return "$0";
  const num = Number(value);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(num);
}


/**
 * Calculates days between today and a target date string
 */
export function getDaysRemaining(targetDateStr) {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates regulatory risk against Ven. CREG vs fecha actual (hoy):
 * diasHastaVencimiento = fechaVenCREG - fechaActual
 * diasHastaVencimiento <= 45 y >= 0  → Por vencer
 * diasHastaVencimiento < 0           → Vencido
 * diasHastaVencimiento > 45          → En tiempo
 * fechaVenCREG ausente               → Sin dato (no genera falso positivo)
 */
export function getCregRegulatoryRisk(project = {}) {
  const cregStr = project.creg;
  const realProgress = Number(project.realProgress) || 0;

  // If project is completed or already connected to grid, it is no longer at risk
  if (realProgress >= 100 || project.gridConnected || project.connectionState === "Energizado" || project.connectionState === "Entregado") {
    return {
      riskLevel: "COMPLETED",
      daysLeft: null,
      message: "Proyecto conectado/completado",
      isViolation: false,
      badgeClass: "text-purple-700 bg-purple-50 border border-purple-200",
      badgeLabel: "Conectado"
    };
  }

  // Active project without registered CREG date -> Sin dato
  if (!cregStr || !String(cregStr).trim()) {
    return {
      riskLevel: "NO_DATA",
      daysLeft: null,
      message: "Sin fecha CREG registrada",
      isViolation: false,
      badgeClass: "text-slate-500 bg-slate-100 border border-slate-200",
      badgeLabel: "Sin dato"
    };
  }

  const cregDate = new Date(cregStr);
  if (isNaN(cregDate.getTime())) {
    return {
      riskLevel: "NO_DATA",
      daysLeft: null,
      message: "Fecha CREG inválida",
      isViolation: false,
      badgeClass: "text-slate-500 bg-slate-100 border border-slate-200",
      badgeLabel: "Sin dato"
    };
  }

  // Calculate days against TODAY (calendar days)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cregDay = new Date(cregDate.getFullYear(), cregDate.getMonth(), cregDate.getDate());
  const diasHastaVencimiento = Math.ceil((cregDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diasHastaVencimiento < 0) {
    return {
      riskLevel: "CRITICAL",
      daysLeft: diasHastaVencimiento,
      message: `Plazo CREG vencido hace ${Math.abs(diasHastaVencimiento)} días`,
      isViolation: true,
      badgeClass: "text-rose-700 bg-rose-100 border border-rose-300 font-bold animate-pulse",
      badgeLabel: `Vencido hace ${Math.abs(diasHastaVencimiento)}d`
    };
  }

  if (diasHastaVencimiento <= 45) {
    return {
      riskLevel: "WARNING",
      daysLeft: diasHastaVencimiento,
      message: `Faltan ${diasHastaVencimiento} días para vencer plazo CREG (límite ≤ 45d)`,
      isViolation: false,
      badgeClass: "text-amber-800 bg-amber-100 border border-amber-300 font-semibold",
      badgeLabel: `Faltan ${diasHastaVencimiento}d`
    };
  }

  // Safe / En tiempo (> 45 days)
  return {
    riskLevel: "SAFE",
    daysLeft: diasHastaVencimiento,
    message: `En tiempo (Faltan ${diasHastaVencimiento} días para vencer)`,
    isViolation: false,
    badgeClass: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    badgeLabel: "En tiempo"
  };
}

/**
 * Evaluates FPO Schedule Risk crossing schedule, real progress, scheduled progress, GAP, and FPO deadline.
 */
export function getFpoScheduleRisk(project = {}) {
  const realProgress = Number(project.realProgress) || 0;
  const scheduledProgress = Number(project.scheduledProgress) || 0;
  const gap = calculateGap(realProgress, scheduledProgress);
  const isCompleted = realProgress >= 100 || project.gridConnected || project.connectionState === "Energizado" || project.connectionState === "Entregado";

  if (isCompleted) {
    return {
      isAtRisk: false,
      riskLevel: "COMPLETED",
      daysLeft: null,
      gap,
      realProgress,
      scheduledProgress,
      message: "Proyecto conectado / completado"
    };
  }

  const fpoStr = project.fpo;
  if (!fpoStr || !String(fpoStr).trim()) {
    return {
      isAtRisk: false,
      riskLevel: "MISSING",
      daysLeft: null,
      gap,
      realProgress,
      scheduledProgress,
      message: "Sin fecha FPO"
    };
  }

  const fpoDate = new Date(fpoStr);
  if (isNaN(fpoDate.getTime())) {
    return {
      isAtRisk: false,
      riskLevel: "MISSING",
      daysLeft: null,
      gap,
      realProgress,
      scheduledProgress,
      message: "FPO inválida"
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fpoDay = new Date(fpoDate.getFullYear(), fpoDate.getMonth(), fpoDate.getDate());
  const daysLeft = Math.ceil((fpoDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Risk condition: FPO past or GAP critical delay > 15% (gap < -15)
  const isAtRisk = daysLeft < 0 || gap < -15;

  if (isAtRisk) {
    return {
      isAtRisk: true,
      riskLevel: "CRITICAL",
      daysLeft,
      gap,
      realProgress,
      scheduledProgress,
      message: daysLeft < 0 
        ? `🔴 Riesgo FPO: Fecha vencida hace ${Math.abs(daysLeft)} días` 
        : `🔴 Riesgo FPO: Atraso crítico de ${Math.abs(gap)}% (límite > 15%)`
    };
  }

  return {
    isAtRisk: false,
    riskLevel: "SAFE",
    daysLeft,
    gap,
    realProgress,
    scheduledProgress,
    message: "En tiempo"
  };
}

/**
 * Evaluates in-process billing alerts: all payment milestones in "En trámite" or "Saldo Pendiente"
 * with their respective elapsed days waiting for disbursement.
 */
export function getPendingBillingAlerts(projects = []) {
  const alerts = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  projects.forEach((project) => {
    const milestones = project.paymentMilestones || [];
    milestones.forEach((m) => {
      const status = m.status || "";
      const isEnTramite = status === "En trámite" || status === "Saldo Pendiente" || status.toLowerCase().includes("trámite") || status.toLowerCase().includes("tramite") || status.toLowerCase().includes("saldo pendiente");

      if (isEnTramite) {
        let daysInProcess = 0;
        const dateRef = m.submittedAt || m.radicadoAt || m.date;
        if (dateRef) {
          const subDate = new Date(dateRef);
          if (!isNaN(subDate.getTime())) {
            const subDay = new Date(subDate.getFullYear(), subDate.getMonth(), subDate.getDate());
            daysInProcess = Math.max(0, Math.floor((today.getTime() - subDay.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }

        const amountCop = (status === "Saldo Pendiente" || status.toLowerCase().includes("saldo")) && m.saldoPendienteCop !== undefined && m.saldoPendienteCop !== ""
          ? Number(m.saldoPendienteCop) || 0
          : Number(m.valueCop) || 0;
        const amountUsd = (status === "Saldo Pendiente" || status.toLowerCase().includes("saldo")) && m.saldoPendienteUsd !== undefined && m.saldoPendienteUsd !== ""
          ? Number(m.saldoPendienteUsd) || 0
          : Number(m.valueUsd) || 0;

        alerts.push({
          projectId: project.id,
          projectName: project.name || "Proyecto",
          milestoneId: m.id,
          milestoneName: m.name || "Hito de pago",
          status: m.status,
          submittedAt: m.submittedAt || m.radicadoAt || m.date || null,
          daysInProcess,
          amountCop,
          amountUsd,
          message: daysInProcess > 0
            ? `${daysInProcess} días de espera por desembolso`
            : `Facturación en trámite (sin fecha de radicación registrada)`
        });
      }
    });
  });

  // Sort descending by days waiting for disbursement (oldest first)
  alerts.sort((a, b) => b.daysInProcess - a.daysInProcess);

  return alerts;
}

/**
 * Calculates aggregated metrics for a list of projects
 */
export function getPortfolioMetrics(projects = []) {
  if (!projects.length) {
    return {
      total: 0,
      avgReal: 0,
      avgScheduled: 0,
      avgGap: 0,
      delayedCount: 0,
      onTimeCount: 0,
      aheadCount: 0,
      atRiskCount: 0,
      criticalCount: 0,
      improvingCount: 0,
      cregCriticalCount: 0,
      cregWarningCount: 0,
      cregMissingCount: 0,
      cregTotalAlertsCount: 0
    };
  }

  let totalReal = 0;
  let totalScheduled = 0;
  let totalGap = 0;
  let delayedCount = 0;
  let onTimeCount = 0;
  let aheadCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;
  let improvingCount = 0;
  let cregCriticalCount = 0;
  let cregWarningCount = 0;
  let cregMissingCount = 0;
  const projectWeights = projects.map((project) => {
    const trm = Number(project.trmProyecto) || 0;
    return (Number(project.capexCop) || 0) + (Number(project.capexUsd) || 0) * trm;
  });
  const totalCapexWeight = projectWeights.reduce((sum, weight) => sum + weight, 0);
  let weightedReal = 0;
  let weightedScheduled = 0;
  let appliedWeight = 0;

  projects.forEach((proj, index) => {
    const real = Number(proj.realProgress) || 0;
    const sched = Number(proj.scheduledProgress) || 0;
    const gap = Number(proj.gap) || 0;
    const prevGap = proj.previousGap !== undefined ? Number(proj.previousGap) : gap;

    totalReal += real;
    totalScheduled += sched;
    totalGap += gap;
    const weight = totalCapexWeight > 0 ? projectWeights[index] : 1;
    weightedReal += real * weight;
    weightedScheduled += sched * weight;
    appliedWeight += weight;

    const s = (proj.status || "").toLowerCase();
    if (s.includes("atrasad") || gap < -15) delayedCount++;
    else if (s.includes("adelantad") || gap > 5) aheadCount++;
    else if (s.includes("rezago") || (gap < -5 && gap >= -15)) atRiskCount++;
    else onTimeCount++;

    if (gap < -25) criticalCount++;
    if (gap > prevGap + 0.1) improvingCount++;

    // CREG risk check
    const cregRisk = getCregRegulatoryRisk(proj);
    if (cregRisk.riskLevel === "CRITICAL") cregCriticalCount++;
    else if (cregRisk.riskLevel === "WARNING") cregWarningCount++;
    else if (cregRisk.riskLevel === "NO_DATA") cregMissingCount++;
  });

  const total = projects.length;
  return {
    total,
    avgReal: Number(((appliedWeight > 0 ? weightedReal / appliedWeight : totalReal / total)).toFixed(2)),
    avgScheduled: Number(((appliedWeight > 0 ? weightedScheduled / appliedWeight : totalScheduled / total)).toFixed(2)),
    avgGap: Number(((appliedWeight > 0 ? weightedReal / appliedWeight - weightedScheduled / appliedWeight : totalGap / total)).toFixed(2)),
    delayedCount,
    onTimeCount,
    aheadCount,
    atRiskCount,
    criticalCount,
    improvingCount,
    cregCriticalCount,
    cregWarningCount,
    cregMissingCount,
    cregTotalAlertsCount: cregCriticalCount + cregWarningCount
  };
}

/**
 * Calculates aggregated financial totals (COP & USD) across a list of projects
 */
export function getPortfolioFinancials(projects = []) {
  let totalCop = 0;
  let totalUsd = 0;
  let cobradoCop = 0;
  let cobradoUsd = 0;
  let enTramiteCop = 0;
  let enTramiteUsd = 0;
  let porCobrarCop = 0;
  let porCobrarUsd = 0;

  projects.forEach((p) => {
    const milestones = p.paymentMilestones || [];
    milestones.forEach((m) => {
      const vCop = Number(m.valueCop) || 0;
      const vUsd = Number(m.valueUsd) || 0;
      totalCop += vCop;
      totalUsd += vUsd;
      const st = (m.status || "").toLowerCase();
      if (st.includes("cobrad")) {
        cobradoCop += vCop;
        cobradoUsd += vUsd;
      } else if (st.includes("saldo pendiente")) {
        const saldoCop = m.saldoPendienteCop !== undefined && m.saldoPendienteCop !== "" ? Number(m.saldoPendienteCop) || 0 : vCop;
        const saldoUsd = m.saldoPendienteUsd !== undefined && m.saldoPendienteUsd !== "" ? Number(m.saldoPendienteUsd) || 0 : vUsd;
        enTramiteCop += saldoCop;
        enTramiteUsd += saldoUsd;
        porCobrarCop += Math.max(0, vCop - saldoCop);
        porCobrarUsd += Math.max(0, vUsd - saldoUsd);
      } else if (st.includes("trámite") || st.includes("tramite")) {
        enTramiteCop += vCop;
        enTramiteUsd += vUsd;
      } else {
        porCobrarCop += vCop;
        porCobrarUsd += vUsd;
      }
    });
  });

  const totalEquiv = totalCop + totalUsd * 4000;
  const cobradoEquiv = cobradoCop + cobradoUsd * 4000;
  const effectiveness = totalEquiv > 0 ? Math.round((cobradoEquiv / totalEquiv) * 100) : 100;

  return {
    totalCop,
    totalUsd,
    cobradoCop,
    cobradoUsd,
    enTramiteCop,
    enTramiteUsd,
    porCobrarCop,
    porCobrarUsd,
    effectiveness
  };
}
