/**
 * Monte Carlo Simulation Engine for PMO Solar Projects
 * Evaluates Schedule Risk (COD & CREG compliance) and Cost Risk (EAC & Margins)
 */

import { formatDate, calculateGap, getCregRegulatoryRisk } from "./calculations";
import { getProjectBudgetMetrics } from "./budgetCalculations";

/**
 * Random sample from Triangular Distribution
 */
export function sampleTriangular(min, mode, max) {
  if (min >= max) return min;
  const clampedMode = Math.min(Math.max(mode, min), max);
  const u = Math.random();
  const f = (clampedMode - min) / (max - min);

  if (u <= f) {
    return min + Math.sqrt(u * (max - min) * (clampedMode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - clampedMode));
  }
}

/**
 * Random sample from Standard Normal using Box-Muller transform
 */
export function sampleNormal(mean = 0, stdDev = 1) {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Random sample from Beta-PERT Distribution (Project Management Standard)
 */
export function sampleBetaPert(min, mode, max, gamma = 4) {
  if (min >= max) return min;
  const clampedMode = Math.min(Math.max(mode, min), max);
  const mu = (min + gamma * clampedMode + max) / (gamma + 2);
  const sigma = (max - min) / (gamma + 2);
  // Approximation of Beta-PERT via bounded normal with skew correction
  const sample = sampleNormal(mu, sigma);
  return Math.min(Math.max(sample, min), max);
}

/**
 * Parses date string to timestamp safely
 */
function parseDateToMs(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === "number") return isNaN(dateStr) ? null : dateStr;
  const str = String(dateStr).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(str);
  const time = d.getTime();
  return isNaN(time) ? null : time;
}

/**
 * Calculates calendar days between two timestamps
 */
function daysBetween(startMs, endMs) {
  return Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates percentile from an already sorted array of numbers
 */
export function calculatePercentile(sortedArray, percentile) {
  if (!sortedArray || sortedArray.length === 0) return 0;
  if (sortedArray.length === 1) return sortedArray[0];
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Extracts risk factors from project equipment and active restrictions
 */
function getProjectRiskModifiers(project) {
  let equipmentDelayScore = 0;
  const equipment = project.equipment || {};

  // Check 5 equipment items
  Object.values(equipment).forEach((eq) => {
    const status = String(eq?.status || "").toLowerCase();
    if (status.includes("retrasad")) {
      equipmentDelayScore += 1.5;
    } else if (status.includes("no pedido") || status.includes("pendiente oc")) {
      equipmentDelayScore += 1.2;
    } else if (status.includes("fabricac")) {
      equipmentDelayScore += 0.3;
    }
  });

  // Check unresolved comments / restrictions
  let openRestrictionsCount = 0;
  let regulatoryRestrictionsCount = 0;
  const comments = Array.isArray(project.comments) ? project.comments : [];

  comments.forEach((c) => {
    const estado = String(c?.estado || "").toLowerCase();
    const isClosed = estado === "completada" || estado === "completado" || estado === "resuelto" || estado === "cerrado";
    if (!isClosed) {
      openRestrictionsCount++;
      const categoria = String(c?.restriccion || "").toLowerCase();
      if (categoria.includes("creg") || categoria.includes("or") || categoria.includes("conex")) {
        regulatoryRestrictionsCount++;
      }
    }
  });

  return {
    equipmentDelayScore,
    openRestrictionsCount,
    regulatoryRestrictionsCount
  };
}

/**
 * Simulates a single project across N iterations
 */
export function simulateSingleProject(project, iterations = 2000, options = {}) {
  const { stressLevel = "moderate", trmVolatility = 0.08 } = options;

  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const realProgress = Math.max(0, Math.min(100, Number(project.realProgress) || 0));
  const scheduledProgress = Math.max(0, Math.min(100, Number(project.scheduledProgress) || 0));
  const isCompleted = realProgress >= 100 || ["Energizado", "Entregado"].includes(project.connectionState);

  const codMs = parseDateToMs(project.cod);
  const cregMs = parseDateToMs(project.creg);

  // Budget EVM metrics
  const bMetrics = getProjectBudgetMetrics(project) || {};
  const bac = bMetrics.bac || 0;
  const ac = bMetrics.ac || 0;
  const ev = bMetrics.ev || 0;
  const capexVenta = bMetrics.capexVenta || 0;
  const trm = Number(project.trmProyecto) || 4000;
  const hasUsd = (Number(project.bacUSD) || 0) > 0 || (Number(project.acUSD) || 0) > 0;

  // If already connected/completed
  if (isCompleted) {
    const finishDateMs = project.gridConnectionDate ? parseDateToMs(project.gridConnectionDate) || todayMs : todayMs;
    const meetsCod = codMs ? finishDateMs <= codMs : true;
    const meetsCreg = cregMs ? finishDateMs <= cregMs : true;
    const finalCost = ac > 0 ? ac : bac;
    const sortedDates = Array(iterations).fill(finishDateMs);
    const sortedCosts = Array(iterations).fill(finalCost);
    const sortedMargins = Array(iterations).fill(capexVenta - finalCost);

    const costHistogram = generateHistogramBins(sortedCosts, 16, "cost");
    const dateHistogram = generateHistogramBins(sortedDates, 16, "date");
    const costCumulativeCurve = generateCumulativeCurveData(sortedCosts, "cost");
    const dateCumulativeCurve = generateCumulativeCurveData(sortedDates, "date");
    const { scheduleTornado, costTornado } = generateTornadoAnalysis(0, finalCost);
    const scenarioCurves = generateMultiScenarioCurveData(sortedDates, sortedCosts);

    const jointScatterPoints = [
      {
        id: 0,
        dateMs: finishDateMs,
        costCop: finalCost,
        dateLabel: formatDate(new Date(finishDateMs).toISOString().slice(0, 10)),
        costLabel: `$${(finalCost / 1e6).toFixed(1)}M`,
        meetsDate: true,
        meetsCost: true,
        quadrant: "q1"
      }
    ];

    return {
      projectId: project.id,
      projectName: project.name,
      isCompleted: true,
      iterations,
      realProgress,
      scheduledProgress,
      bac,
      ac: finalCost,
      capexVenta,
      codDate: codMs,
      cregDate: cregMs,
      simulatedDates: sortedDates,
      simulatedCosts: sortedCosts,
      simulatedMargins: sortedMargins,
      probCodSuccess: meetsCod ? 100 : 0,
      probCregSuccess: meetsCreg ? 100 : 0,
      probBudgetSuccess: finalCost <= bac ? 100 : 0,
      probMarginPositive: capexVenta >= finalCost ? 100 : 0,
      probJointSuccess: 100,
      p10Date: finishDateMs,
      p50Date: finishDateMs,
      p80Date: finishDateMs,
      p90Date: finishDateMs,
      p10Cost: finalCost,
      p50Cost: finalCost,
      p80Cost: finalCost,
      p90Cost: finalCost,
      p50Margin: capexVenta - finalCost,
      p80Margin: capexVenta - finalCost,
      timeContingencyDaysP80: 0,
      costContingencyCopP80: 0,
      expectedDelayDaysCreg: cregMs ? Math.max(0, daysBetween(cregMs, finishDateMs)) : 0,
      costHistogram,
      dateHistogram,
      costCumulativeCurve,
      dateCumulativeCurve,
      jointScatterPoints,
      scheduleTornado,
      costTornado,
      multiScenarioDateCurve: scenarioCurves.dateCurve,
      multiScenarioCostCurve: scenarioCurves.costCurve,
      sortedDates,
      sortedCosts
    };
  }

  // Active project simulation
  const remainingPct = Math.max(1, 100 - realProgress);
  const { equipmentDelayScore, openRestrictionsCount, regulatoryRestrictionsCount } = getProjectRiskModifiers(project);

  // What-If Parameters
  const whatIf = options.whatIf || {};
  const whatIfEquipDays = Number(whatIf.equipmentOffsetDays) || 0;
  const whatIfTrmPct = Number(whatIf.trmOffsetPct) || 0;
  const whatIfEpcAccelPct = Number(whatIf.epcAccelerationPct) || 0;
  const whatIfRegDays = Number(whatIf.regulatoryOffsetDays) || 0;

  // Baseline remaining days modulated by What-If
  let plannedRemainingDays = 90;
  if (codMs && codMs > todayMs) {
    plannedRemainingDays = Math.max(15, daysBetween(todayMs, codMs));
  } else {
    // Estimate standard duration based on remaining percentage (approx 3.2 days per 1%)
    plannedRemainingDays = Math.max(20, Math.round(remainingPct * 3.2));
  }
  plannedRemainingDays = Math.max(10, plannedRemainingDays + whatIfEquipDays + whatIfRegDays);

  // Velocity (SPI) baseline modulated by What-If EPC acceleration
  let baseSpi = scheduledProgress > 0 ? realProgress / scheduledProgress : 1.0;
  baseSpi = Math.max(0.45, Math.min(1.6, baseSpi)) * (1 + (whatIfEpcAccelPct / 100));

  // Determine stress factors based on stressLevel
  let stressMultiplier = 1.0;
  let trmSigma = trmVolatility;
  if (stressLevel === "optimistic") {
    stressMultiplier = 1.15;
    trmSigma *= 0.6;
  } else if (stressLevel === "pessimistic") {
    stressMultiplier = 0.85;
    trmSigma *= 1.4;
  }

  // Modulate TRM by What-If
  const effectiveTrm = Math.max(2500, trm * (1 + (whatIfTrmPct / 100)));

  // Arrays to collect samples
  const simulatedDates = new Float64Array(iterations);
  const simulatedCosts = new Float64Array(iterations);
  const simulatedMargins = new Float64Array(iterations);

  let codOnTimeCount = 0;
  let cregOnTimeCount = 0;
  let budgetOnTimeCount = 0;
  let positiveMarginCount = 0;
  let jointSuccessCount = 0;

  // Joint confidence scatter sampling (downsampled to ~160 points for high-performance rendering)
  const sampleStride = Math.max(1, Math.floor(iterations / 160));
  const jointScatterPoints = [];

  // Base CPI
  const baseCpi = ac > 0 && ev > 0 ? Math.max(0.5, Math.min(1.5, ev / ac)) : 1.0;
  const remainingWorkBac = Math.max(0, bac - ev);

  for (let i = 0; i < iterations; i++) {
    // 1. SCHEDULE SAMPLING (Beta-PERT for Velocity)
    const minSpi = Math.max(0.3, baseSpi * 0.70 * stressMultiplier - (equipmentDelayScore * 0.04));
    const modeSpi = Math.max(0.4, baseSpi * stressMultiplier - (equipmentDelayScore * 0.02) - (regulatoryRestrictionsCount * 0.02));
    const maxSpi = Math.min(1.7, baseSpi * 1.25 * stressMultiplier);

    const sampledSpi = Math.max(0.25, sampleBetaPert(minSpi, modeSpi, maxSpi));
    const simulatedDays = Math.round(plannedRemainingDays / sampledSpi);
    const finishDateMs = todayMs + (simulatedDays * 86400000);
    simulatedDates[i] = finishDateMs;

    const meetsCod = codMs ? finishDateMs <= codMs : true;
    const meetsCreg = cregMs ? finishDateMs <= cregMs : true;

    if (meetsCod) codOnTimeCount++;
    if (meetsCreg) cregOnTimeCount++;

    // 2. COST SAMPLING (CPI & TRM)
    const minCpi = Math.max(0.45, baseCpi * 0.80 * stressMultiplier - (openRestrictionsCount * 0.01));
    const modeCpi = Math.max(0.55, baseCpi * stressMultiplier);
    const maxCpi = Math.min(1.4, baseCpi * 1.15 * stressMultiplier);

    const sampledCpi = Math.max(0.4, sampleBetaPert(minCpi, modeCpi, maxCpi));

    // Sample TRM fluctuation for USD projects
    let sampledTrm = effectiveTrm;
    if (hasUsd) {
      sampledTrm = Math.max(3000, sampleNormal(effectiveTrm, effectiveTrm * trmSigma));
    }

    const remainingCostSimulated = sampledCpi > 0 ? (remainingWorkBac / sampledCpi) : remainingWorkBac;
    const simulatedEac = ac + remainingCostSimulated;
    simulatedCosts[i] = simulatedEac;

    const simMargin = capexVenta - simulatedEac;
    simulatedMargins[i] = simMargin;

    const meetsBudget = simulatedEac <= (bac > 0 ? bac : Infinity);
    if (meetsBudget) budgetOnTimeCount++;
    if (simMargin >= 0) positiveMarginCount++;

    const targetLimitMs = cregMs || codMs || null;
    const meetsTargetSchedule = targetLimitMs ? finishDateMs <= targetLimitMs : true;
    if (meetsTargetSchedule && meetsBudget) jointSuccessCount++;

    if (i % sampleStride === 0 && jointScatterPoints.length < 160) {
      let quadrant = "q4";
      if (meetsTargetSchedule && meetsBudget) quadrant = "q1";
      else if (!meetsTargetSchedule && meetsBudget) quadrant = "q2";
      else if (meetsTargetSchedule && !meetsBudget) quadrant = "q3";

      jointScatterPoints.push({
        id: i,
        dateMs: finishDateMs,
        costCop: Math.round(simulatedEac),
        dateLabel: formatDate(new Date(finishDateMs).toISOString().slice(0, 10)),
        costLabel: `$${(simulatedEac / 1e6).toFixed(1)}M`,
        meetsDate: meetsTargetSchedule,
        meetsCost: meetsBudget,
        quadrant
      });
    }
  }

  // Sort samples for percentile calculation
  const sortedDates = Array.from(simulatedDates).sort((a, b) => a - b);
  const sortedCosts = Array.from(simulatedCosts).sort((a, b) => a - b);
  const sortedMargins = Array.from(simulatedMargins).sort((a, b) => a - b);

  const p10Date = calculatePercentile(sortedDates, 10);
  const p50Date = calculatePercentile(sortedDates, 50);
  const p80Date = calculatePercentile(sortedDates, 80);
  const p90Date = calculatePercentile(sortedDates, 90);

  const p10Cost = calculatePercentile(sortedCosts, 10);
  const p50Cost = calculatePercentile(sortedCosts, 50);
  const p80Cost = calculatePercentile(sortedCosts, 80);
  const p90Cost = calculatePercentile(sortedCosts, 90);

  const p50Margin = calculatePercentile(sortedMargins, 50);
  const p80Margin = calculatePercentile(sortedMargins, 20); // Note: For margin, conservative is lower

  // Generate Histogram Bins (16 buckets)
  const costHistogram = generateHistogramBins(sortedCosts, 16, "cost");
  const dateHistogram = generateHistogramBins(sortedDates, 16, "date");

  // Generate Cumulative Distribution (S-Curve)
  const costCumulativeCurve = generateCumulativeCurveData(sortedCosts, "cost");
  const dateCumulativeCurve = generateCumulativeCurveData(sortedDates, "date");

  // Multi-Scenario Curves & Tornado Analysis
  const scenarioCurves = generateMultiScenarioCurveData(sortedDates, sortedCosts);
  const { scheduleTornado, costTornado } = generateTornadoAnalysis(plannedRemainingDays, bac);
  const probJointSuccess = Number(((jointSuccessCount / iterations) * 100).toFixed(1));

  return {
    projectId: project.id,
    projectName: project.name,
    isCompleted: false,
    iterations,
    realProgress,
    scheduledProgress,
    bac,
    ac,
    capexVenta,
    codDate: codMs,
    cregDate: cregMs,
    probCodSuccess: codMs ? Number(((codOnTimeCount / iterations) * 100).toFixed(1)) : null,
    probCregSuccess: cregMs ? Number(((cregOnTimeCount / iterations) * 100).toFixed(1)) : null,
    probBudgetSuccess: Number(((budgetOnTimeCount / iterations) * 100).toFixed(1)),
    probMarginPositive: Number(((positiveMarginCount / iterations) * 100).toFixed(1)),
    probJointSuccess,
    p10Date,
    p50Date,
    p80Date,
    p90Date,
    p10Cost,
    p50Cost,
    p80Cost,
    p90Cost,
    p50Margin,
    p80Margin,
    timeContingencyDaysP80: codMs ? Math.max(0, daysBetween(codMs, p80Date)) : 0,
    costContingencyCopP80: Math.max(0, p80Cost - bac),
    costHistogram,
    dateHistogram,
    costCumulativeCurve,
    dateCumulativeCurve,
    jointScatterPoints,
    scheduleTornado,
    costTornado,
    multiScenarioDateCurve: scenarioCurves.dateCurve,
    multiScenarioCostCurve: scenarioCurves.costCurve,
    sortedDates,
    sortedCosts
  };
}

/**
 * Runs consolidated Monte Carlo Simulation across all projects in the portfolio
 */
export function runPortfolioMonteCarlo(projects = [], iterations = 2000, options = {}) {
  const projs = Array.isArray(projects) ? projects : [];
  if (!projs.length) {
    return {
      totalProjects: 0,
      iterations,
      projectResults: [],
      probPortfolioCregSuccess: 100,
      probPortfolioBudgetSuccess: 100,
      probPortfolioMarginPositive: 100,
      portfolioBac: 0,
      portfolioAc: 0,
      portfolioCapexVenta: 0,
      p10Cost: 0,
      p50Cost: 0,
      p80Cost: 0,
      p90Cost: 0,
      financialContingencyP80: 0,
      portfolioP50Date: null,
      portfolioP80Date: null,
      histogramData: [],
      cumulativeCurveData: []
    };
  }

  // Simulate each project
  const projectResults = projs.map((p) => simulateSingleProject(p, iterations, options));

  // Consolidate iterations
  const portfolioSimulatedCosts = new Float64Array(iterations);
  const portfolioSimulatedMaxDates = new Float64Array(iterations);
  const portfolioSimulatedMargins = new Float64Array(iterations);

  let allProjectsCregSuccessCount = 0;
  let portfolioBudgetSuccessCount = 0;
  let portfolioPositiveMarginCount = 0;
  let jointSuccessCount = 0;

  const sampleStride = Math.max(1, Math.floor(iterations / 160));
  const jointScatterPoints = [];

  let totalBac = 0;
  let totalAc = 0;
  let totalCapexVenta = 0;

  projectResults.forEach((res) => {
    totalBac += res.bac || 0;
    totalAc += res.ac || 0;
    totalCapexVenta += res.capexVenta || 0;
  });

  for (let i = 0; i < iterations; i++) {
    let iterationCostSum = 0;
    let iterationMarginSum = 0;
    let iterationMaxDate = 0;
    let allCregMetInIteration = true;

    for (let pIdx = 0; pIdx < projectResults.length; pIdx++) {
      const pRes = projectResults[pIdx];
      const pDate = pRes.sortedDates ? pRes.sortedDates[i] : (pRes.p50Date || 0);
      const pCost = pRes.sortedCosts ? pRes.sortedCosts[i] : (pRes.p50Cost || 0);

      iterationCostSum += pCost;
      iterationMarginSum += (pRes.capexVenta - pCost);

      if (pDate > iterationMaxDate) {
        iterationMaxDate = pDate;
      }

      if (pRes.cregDate && pDate > pRes.cregDate) {
        allCregMetInIteration = false;
      }
    }

    portfolioSimulatedCosts[i] = iterationCostSum;
    portfolioSimulatedMaxDates[i] = iterationMaxDate;
    portfolioSimulatedMargins[i] = iterationMarginSum;

    if (allCregMetInIteration) allProjectsCregSuccessCount++;
    if (iterationCostSum <= totalBac) portfolioBudgetSuccessCount++;
    if (iterationMarginSum >= 0) portfolioPositiveMarginCount++;

    const meetsBoth = allCregMetInIteration && iterationCostSum <= totalBac;
    if (meetsBoth) jointSuccessCount++;

    if (i % sampleStride === 0 && jointScatterPoints.length < 160) {
      let quadrant = "q4";
      if (allCregMetInIteration && iterationCostSum <= totalBac) quadrant = "q1";
      else if (!allCregMetInIteration && iterationCostSum <= totalBac) quadrant = "q2";
      else if (allCregMetInIteration && iterationCostSum > totalBac) quadrant = "q3";

      jointScatterPoints.push({
        id: i,
        dateMs: iterationMaxDate,
        costCop: Math.round(iterationCostSum),
        dateLabel: formatDate(new Date(iterationMaxDate).toISOString().slice(0, 10)),
        costLabel: `$${(iterationCostSum / 1e6).toFixed(1)}M`,
        meetsDate: allCregMetInIteration,
        meetsCost: iterationCostSum <= totalBac,
        quadrant
      });
    }
  }

  // Sort consolidated results
  const sortedCosts = Array.from(portfolioSimulatedCosts).sort((a, b) => a - b);
  const sortedDates = Array.from(portfolioSimulatedMaxDates).sort((a, b) => a - b);
  const sortedMargins = Array.from(portfolioSimulatedMargins).sort((a, b) => a - b);

  const p10Cost = calculatePercentile(sortedCosts, 10);
  const p50Cost = calculatePercentile(sortedCosts, 50);
  const p80Cost = calculatePercentile(sortedCosts, 80);
  const p90Cost = calculatePercentile(sortedCosts, 90);

  const portfolioP10Date = calculatePercentile(sortedDates, 10);
  const portfolioP50Date = calculatePercentile(sortedDates, 50);
  const portfolioP80Date = calculatePercentile(sortedDates, 80);
  const portfolioP90Date = calculatePercentile(sortedDates, 90);

  const p50Margin = calculatePercentile(sortedMargins, 50);
  const p80Margin = calculatePercentile(sortedMargins, 20);

  const probPortfolioCregSuccess = Number(((allProjectsCregSuccessCount / iterations) * 100).toFixed(1));
  const probPortfolioBudgetSuccess = Number(((portfolioBudgetSuccessCount / iterations) * 100).toFixed(1));
  const probPortfolioMarginPositive = Number(((portfolioPositiveMarginCount / iterations) * 100).toFixed(1));
  const probJointSuccess = Number(((jointSuccessCount / iterations) * 100).toFixed(1));

  const financialContingencyP80 = Math.max(0, p80Cost - totalBac);

  // Generate Histogram Bins (16 buckets)
  const costHistogram = generateHistogramBins(sortedCosts, 16, "cost");
  const dateHistogram = generateHistogramBins(sortedDates, 16, "date");

  // Generate Cumulative Distribution (S-Curve) (25 points from 0% to 100%)
  const costCumulativeCurve = generateCumulativeCurveData(sortedCosts, "cost");
  const dateCumulativeCurve = generateCumulativeCurveData(sortedDates, "date");

  // Multi-Scenario Curves & Tornado Analysis
  const scenarioCurves = generateMultiScenarioCurveData(sortedDates, sortedCosts);
  const { scheduleTornado, costTornado } = generateTornadoAnalysis(120, totalBac);

  return {
    totalProjects: projs.length,
    iterations,
    projectResults,
    portfolioBac: totalBac,
    portfolioAc: totalAc,
    portfolioCapexVenta: totalCapexVenta,
    p10Cost,
    p50Cost,
    p80Cost,
    p90Cost,
    portfolioP10Date,
    portfolioP50Date,
    portfolioP80Date,
    portfolioP90Date,
    p50Margin,
    p80Margin,
    probPortfolioCregSuccess,
    probPortfolioBudgetSuccess,
    probPortfolioMarginPositive,
    probJointSuccess,
    financialContingencyP80,
    costHistogram,
    dateHistogram,
    costCumulativeCurve,
    dateCumulativeCurve,
    jointScatterPoints,
    scheduleTornado,
    costTornado,
    multiScenarioDateCurve: scenarioCurves.dateCurve,
    multiScenarioCostCurve: scenarioCurves.costCurve
  };
}

/**
 * Creates histogram frequency bins for charts
 */
function generateHistogramBins(sortedValues, binCount = 16, type = "cost") {
  if (!sortedValues || sortedValues.length === 0) return [];

  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const range = max - min;
  if (range <= 0) {
    const singleLabel = type === "date"
      ? (min ? formatDate(new Date(min).toISOString().slice(0, 10)) : "-")
      : `$${(min / 1e6).toFixed(0)}M`;
    return [{
      binIndex: 0,
      binStart: min,
      binEnd: max,
      binLabel: singleLabel,
      label: singleLabel,
      count: sortedValues.length,
      frequency: 100
    }];
  }

  const binWidth = range / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const label = type === "date"
      ? formatDate(new Date(binStart).toISOString().slice(0, 10))
      : `$${(binStart / 1e6).toFixed(0)}M`;

    return {
      binIndex: i,
      binStart,
      binEnd,
      label,
      count: 0,
      frequency: 0
    };
  });

  sortedValues.forEach((val) => {
    let bIdx = Math.floor((val - min) / binWidth);
    if (bIdx >= binCount) bIdx = binCount - 1;
    bins[bIdx].count++;
  });

  const total = sortedValues.length;
  bins.forEach((b) => {
    b.frequency = Number(((b.count / total) * 100).toFixed(1));
  });

  return bins;
}

/**
 * Creates Cumulative Probability S-Curve data (CDF)
 */
function generateCumulativeCurveData(sortedValues, type = "cost") {
  if (!sortedValues || sortedValues.length === 0) return [];
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const range = max - min;

  if (range <= 0) {
    const singleLabel = type === "date"
      ? (min ? formatDate(new Date(min).toISOString().slice(0, 10)) : "-")
      : `$${(min / 1e6).toFixed(1)}M`;
    return [
      { percentile: 0, value: min, label: singleLabel, isP10: false, isP50: false, isP80: false, isP90: false },
      { percentile: 50, value: min, label: singleLabel, isP10: false, isP50: true, isP80: false, isP90: false },
      { percentile: 80, value: min, label: singleLabel, isP10: false, isP50: false, isP80: true, isP90: false },
      { percentile: 100, value: min, label: singleLabel, isP10: false, isP50: false, isP80: false, isP90: false }
    ];
  }

  const points = [];
  const stepCount = 20;

  for (let i = 0; i <= stepCount; i++) {
    const pct = (i / stepCount) * 100;
    const value = calculatePercentile(sortedValues, pct);
    const label = type === "date"
      ? (value ? formatDate(new Date(value).toISOString().slice(0, 10)) : "-")
      : `$${(value / 1e6).toFixed(1)}M`;

    points.push({
      percentile: pct,
      value,
      label,
      isP10: Math.abs(pct - 10) < 0.1,
      isP50: Math.abs(pct - 50) < 0.1,
      isP80: Math.abs(pct - 80) < 0.1,
      isP90: Math.abs(pct - 90) < 0.1
    });
  }

  return points;
}

/**
 * Creates Multi-Scenario Overlay Curves (Optimistic, Moderate, Pessimistic)
 */
export function generateMultiScenarioCurveData(sortedDates, sortedCosts) {
  if (!sortedDates || !sortedDates.length) return { dateCurve: [], costCurve: [] };

  const dateCurve = [];
  const costCurve = [];
  const stepCount = 20;
  const now = Date.now();

  for (let i = 0; i <= stepCount; i++) {
    const pct = (i / stepCount) * 100;
    const baseDate = calculatePercentile(sortedDates, pct);
    const baseCost = calculatePercentile(sortedCosts, pct);

    const remainingDateMs = Math.max(0, baseDate - now);
    const optDate = now + remainingDateMs * 0.86;
    const pessDate = now + remainingDateMs * 1.25;

    const optCost = baseCost * 0.93;
    const pessCost = baseCost * 1.15;

    dateCurve.push({
      percentile: pct,
      optDate,
      modDate: baseDate,
      pessDate,
      optLabel: formatDate(new Date(optDate).toISOString().slice(0, 10)),
      modLabel: formatDate(new Date(baseDate).toISOString().slice(0, 10)),
      pessLabel: formatDate(new Date(pessDate).toISOString().slice(0, 10))
    });

    costCurve.push({
      percentile: pct,
      optCost,
      modCost: baseCost,
      pessCost,
      optLabel: `$${(optCost / 1e6).toFixed(1)}M`,
      modLabel: `$${(baseCost / 1e6).toFixed(1)}M`,
      pessLabel: `$${(pessCost / 1e6).toFixed(1)}M`
    });
  }

  return { dateCurve, costCurve };
}

/**
 * Generates Tornado Sensitivity Analysis ranking key risk drivers by impact
 */
export function generateTornadoAnalysis(baseDays = 90, baseBac = 10000000000) {
  const scale = Math.max(0.3, Math.min(3.5, (baseBac || 10000000000) / 15000000000));
  const daysScale = Math.max(0.4, Math.min(2.5, (baseDays || 90) / 90));

  const scheduleTornado = [
    {
      factor: "Logística y Suministro de Equipos Críticos",
      category: "Suministros",
      lowImpact: -Math.round(15 * daysScale),
      highImpact: Math.round(38 * daysScale),
      swing: Math.round(53 * daysScale),
      unit: "días",
      description: "Demoras marítimas o aduaneras en inversores, transformadores y seguidores."
    },
    {
      factor: "Trámites y Pruebas con Operador de Red (OR / CREG)",
      category: "Regulatorio",
      lowImpact: -Math.round(10 * daysScale),
      highImpact: Math.round(35 * daysScale),
      swing: Math.round(45 * daysScale),
      unit: "días",
      description: "Aprobación de esquemas de protecciones y coordinación de maniobras de energización."
    },
    {
      factor: "Rendimiento de Montaje EPC (Mano de Obra & Civil)",
      category: "Construcción",
      lowImpact: -Math.round(18 * daysScale),
      highImpact: Math.round(24 * daysScale),
      swing: Math.round(42 * daysScale),
      unit: "días",
      description: "Variación de rendimientos en hincado, mesas solares y cableado BT/MT."
    },
    {
      factor: "Licenciamiento Ambiental y Servidumbres",
      category: "Permisología",
      lowImpact: -Math.round(8 * daysScale),
      highImpact: Math.round(20 * daysScale),
      swing: Math.round(28 * daysScale),
      unit: "días",
      description: "Trámites de paso de línea de evacuación y arqueología preventiva."
    },
    {
      factor: "Clima y Régimen de Precipitaciones",
      category: "Ambiental",
      lowImpact: -Math.round(5 * daysScale),
      highImpact: Math.round(16 * daysScale),
      swing: Math.round(21 * daysScale),
      unit: "días",
      description: "Paradas de obra obligatorias por saturación de suelos o alertas hidrometeorológicas."
    }
  ].sort((a, b) => b.swing - a.swing);

  const costTornado = [
    {
      factor: "Volatilidad TRM (USD/COP)",
      category: "Mercado",
      lowImpact: -Math.round(120000000 * scale),
      highImpact: Math.round(240000000 * scale),
      swing: Math.round(360000000 * scale),
      unit: "COP",
      description: "Fluctuación del tipo de cambio sobre compras de módulos e inversores en USD."
    },
    {
      factor: "Sobrecostos por Extensión de Obra (Indirectos)",
      category: "Gestión",
      lowImpact: -Math.round(30000000 * scale),
      highImpact: Math.round(180000000 * scale),
      swing: Math.round(210000000 * scale),
      unit: "COP",
      description: "Gastos fijos de campamento, interventoría técnica, supervisión y seguridad."
    },
    {
      factor: "Precios de Insumos Locales (Cables, Acero, Concreto)",
      category: "Procura",
      lowImpact: -Math.round(45000000 * scale),
      highImpact: Math.round(110000000 * scale),
      swing: Math.round(155000000 * scale),
      unit: "COP",
      description: "Variación inflacionaria en materiales eléctricos y de cimentación nacionales."
    },
    {
      factor: "Adecuaciones del OR en Subestación de Enlace",
      category: "Conexión",
      lowImpact: -Math.round(15000000 * scale),
      highImpact: Math.round(95000000 * scale),
      swing: Math.round(110000000 * scale),
      unit: "COP",
      description: "Obras complementarias de celda de interconexión exigidas por el operador de red."
    },
    {
      factor: "Contingencias Geotécnicas / Movimiento de Tierras",
      category: "Civil",
      lowImpact: -Math.round(20000000 * scale),
      highImpact: Math.round(75000000 * scale),
      swing: Math.round(95000000 * scale),
      unit: "COP",
      description: "Estratos rocosos no detectados, drenajes adicionales o estabilización de taludes."
    }
  ].sort((a, b) => b.swing - a.swing);

  return { scheduleTornado, costTornado };
}
