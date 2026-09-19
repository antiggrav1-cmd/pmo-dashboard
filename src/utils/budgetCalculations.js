/**
 * Evaluates single project EVM (Earned Value Management) budget metrics
 */
export function getProjectBudgetMetrics(project = {}) {
  const trm = Number(project.trmProyecto) || 0;
  const hasUsdComponent = [project.bacUSD, project.acUSD, project.capexUsd].some((value) => (Number(value) || 0) !== 0);
  const missingTrm = hasUsdComponent && trm <= 0;

  if (missingTrm) {
    return {
      trm,
      bac: null,
      ac: null,
      capexVenta: null,
      ev: null,
      cpi: null,
      spi: null,
      cv: null,
      eac: null,
      margin: null,
      marginPct: null,
      status: "Falta TRM",
      missingTrm: true
    };
  }

  const bac = (Number(project.bacCOP) || 0) + (Number(project.bacUSD) || 0) * trm;
  const ac = (Number(project.acCOP) || 0) + (Number(project.acUSD) || 0) * trm;
  const capexVenta = (Number(project.capexCop) || 0) + (Number(project.capexUsd) || 0) * trm;
  const realProgress = Math.max(0, Number(project.realProgress) || 0);
  const scheduledProgress = Math.max(0, Number(project.scheduledProgress) || 0);

  const ev = bac * (realProgress / 100);
  const cpi = ac > 0 ? Number((ev / ac).toFixed(2)) : null;
  const spi = scheduledProgress > 0 ? Number((realProgress / scheduledProgress).toFixed(2)) : null;
  const cv = ev - ac;
  const eac = cpi && cpi > 0 ? (bac / (ev / ac)) : bac;
  const margin = capexVenta - eac;
  const marginPct = capexVenta > 0 ? Number(((margin / capexVenta) * 100).toFixed(2)) : 0;
  const status = cpi === null ? "Sin ejecución" : cpi >= 1 ? "Saludable" : cpi >= 0.95 ? "En riesgo" : "Sobrecosto";

  return {
    trm,
    bac,
    ac,
    capexVenta,
    ev,
    cpi,
    spi,
    cv,
    eac,
    margin,
    marginPct,
    status,
    missingTrm: false
  };
}

/**
 * Calculates aggregated EVM portfolio totals
 */
export function getPortfolioBudgetMetrics(projects = []) {
  const totals = projects.reduce((acc, project) => {
    const value = getProjectBudgetMetrics(project);
    if (value.missingTrm) {
      acc.missingTrmCount++;
      return acc;
    }
    acc.bac += value.bac || 0;
    acc.ac += value.ac || 0;
    acc.ev += value.ev || 0;
    acc.capexVenta += value.capexVenta || 0;
    acc.overcost += value.status === "Sobrecosto" ? 1 : 0;
    return acc;
  }, { bac: 0, ac: 0, ev: 0, capexVenta: 0, overcost: 0, missingTrmCount: 0 });

  const cpi = totals.ac > 0 ? Number((totals.ev / totals.ac).toFixed(2)) : null;
  const cv = totals.ev - totals.ac;
  const eac = cpi && cpi > 0 ? (totals.bac / (totals.ev / totals.ac)) : totals.bac;
  const margin = totals.capexVenta - eac;
  const marginPct = totals.capexVenta > 0 ? Number(((margin / totals.capexVenta) * 100).toFixed(2)) : 0;

  return {
    ...totals,
    cpi,
    cv,
    eac,
    margin,
    marginPct
  };
}

/**
 * Calculates SPI (Schedule Performance Index) and CPI (Cost Performance Index) weighted for portfolio
 */
export function getPortfolioPerformanceIndices(projects = []) {
  const totals = projects.reduce((acc, project) => {
    const trm = Number(project.trmProyecto) || 0;
    const weight = (Number(project.capexCop) || 0) + (Number(project.capexUsd) || 0) * trm;
    const real = Math.max(0, Number(project.realProgress) || 0);
    const sched = Math.max(0, Number(project.scheduledProgress) || 0);

    acc.evSchedule += weight * (real / 100);
    acc.pv += weight * (sched / 100);
    return acc;
  }, { evSchedule: 0, pv: 0 });

  const budget = getPortfolioBudgetMetrics(projects);
  const spi = totals.pv > 0 ? Number((totals.evSchedule / totals.pv).toFixed(2)) : null;

  return {
    spi,
    cpi: budget.cpi
  };
}
