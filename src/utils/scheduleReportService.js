import { calculateGap, determineStatus, formatDate, getPortfolioMetrics } from "./calculations";

/**
 * Generates an executive consolidated schedule comparison and diagnosis report across all projects in a portfolio
 * Formatted cleanly for sharing via WhatsApp, Microsoft Teams, Slack or Email.
 */
export function generatePortfolioScheduleSummaryText(projects = [], portfolioName = "") {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const metrics = getPortfolioMetrics(projects);
  const total = projects.length;

  let completedCount = 0;
  let criticalCount = 0;
  let slightCount = 0;
  let onTimeCount = 0;
  let aheadCount = 0;

  const improvedProjects = [];
  const worsenedProjects = [];
  const criticalProjects = [];

  const projectSummaries = projects.map((p, idx) => {
    const real = Number(p.realProgress) || 0;
    const sched = Number(p.scheduledProgress) || 0;
    const gap = calculateGap(real, sched);
    const prevGap = p.previousGap !== "" && p.previousGap !== null && p.previousGap !== undefined
      ? Number(p.previousGap)
      : null;
    const status = determineStatus(gap, real);

    // Count states
    if (real >= 100 || status === "Completado") completedCount++;
    else if (gap < -10) {
      criticalCount++;
      criticalProjects.push({ name: p.name, gap, real, sched });
    } else if (gap < 0) {
      slightCount++;
    } else if (gap > 5) {
      aheadCount++;
    } else {
      onTimeCount++;
    }

    // Trend calculation
    let trendStr = "➖ Sin variación";
    if (prevGap !== null && !isNaN(prevGap)) {
      const diff = Number((gap - prevGap).toFixed(2));
      if (diff > 0.1) {
        trendStr = `📈 Mejoró +${diff}% vs corte anterior (${prevGap > 0 ? `+${prevGap}%` : `${prevGap}%`})`;
        improvedProjects.push({ name: p.name, diff, gap });
      } else if (diff < -0.1) {
        trendStr = `📉 Empeoró ${diff}% vs corte anterior (${prevGap > 0 ? `+${prevGap}%` : `${prevGap}%`})`;
        worsenedProjects.push({ name: p.name, diff, gap });
      } else {
        trendStr = `➖ Estable vs corte anterior (${prevGap > 0 ? `+${prevGap}%` : `${prevGap}%`})`;
      }
    }

    // Status emoji
    let emoji = "🟢";
    if (real >= 100) emoji = "🟣";
    else if (gap < -10) emoji = "🔴";
    else if (gap < 0) emoji = "🟡";
    else if (gap > 5) emoji = "🔵";

    const gapStr = gap > 0 ? `+${gap}%` : `${gap}%`;

    let itemText = `${idx + 1}. ${p.name || "Proyecto"} ${emoji} [${status}]\n`;
    itemText += `   • Avance: ${real}% Real vs ${sched}% Prog. (GAP: ${gapStr})\n`;
    itemText += `   • Tendencia: ${trendStr}\n`;
    if (p.connectionState || p.fpo) {
      itemText += `   • Conexión Red: ${p.connectionState || "Ingeniería"}`;
      if (p.fpo) itemText += ` | Fecha FPO: ${formatDate(p.fpo)}`;
      itemText += `\n`;
    }

    return itemText;
  });

  // Sort highlights
  improvedProjects.sort((a, b) => b.diff - a.diff);
  worsenedProjects.sort((a, b) => a.diff - b.diff);
  criticalProjects.sort((a, b) => a.gap - b.gap);

  const avgGap = metrics.avgGap;
  const avgGapStr = avgGap > 0 ? `+${avgGap}%` : `${avgGap}%`;

  let text = `📊 RESUMEN EJECUTIVO DE CRONOGRAMA Y AVANCES\n`;
  if (portfolioName) text += `Portafolio: ${portfolioName}\n`;
  text += `Fecha de corte: ${dateFormatted}\n`;
  text += `Proyectos evaluados: ${total}\n`;
  text += `Semáforo: 🟢 ${onTimeCount + aheadCount} En tiempo/Adelantado | 🟡 ${slightCount} Rezago Leve | 🔴 ${criticalCount} Críticos${completedCount > 0 ? ` | 🟣 ${completedCount} Completados` : ""}\n`;
  text += `Avance Global: ${metrics.avgReal}% Real vs ${metrics.avgScheduled}% Esperado (GAP: ${avgGapStr})\n`;
  text += `${"═".repeat(50)}\n\n`;

  text += `📌 COMPARATIVA POR PROYECTO:\n\n`;
  text += projectSummaries.join("\n") + "\n";
  text += `${"═".repeat(50)}\n`;
  text += `💡 CONCLUSIONES Y DIAGNÓSTICO:\n`;

  if (criticalCount > 0) {
    const critNames = criticalProjects.map((p) => `${p.name} (${p.gap > 0 ? `+${p.gap}%` : `${p.gap}%`})`).join(", ");
    text += `• 🚨 ${criticalCount} proyecto(s) en Atraso Crítico (GAP < -10%) que requieren plan de choque: ${critNames}.\n`;
  } else {
    text += `• ✅ Ningún proyecto presenta atraso crítico (> 10%). El portafolio se mantiene en niveles controlados.\n`;
  }

  if (slightCount > 0) {
    text += `• ⚠️ ${slightCount} proyecto(s) con Rezago Leve (desvío negativo < 10%) en monitoreo.\n`;
  }

  if (improvedProjects.length > 0) {
    text += `• 📈 Proyecto con mayor recuperación en el corte: ${improvedProjects[0].name} (+${improvedProjects[0].diff}%).\n`;
  }

  if (worsenedProjects.length > 0) {
    text += `• 📉 Proyecto con mayor incremento de desvío: ${worsenedProjects[0].name} (${worsenedProjects[0].diff}%).\n`;
  }

  return text;
}

/**
 * Generates an individual executive schedule report for a single project
 */
export function generateSingleProjectScheduleText(project = {}, portfolioName = "") {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const real = Number(project.realProgress) || 0;
  const sched = Number(project.scheduledProgress) || 0;
  const gap = calculateGap(real, sched);
  const prevGap = project.previousGap !== "" && project.previousGap !== null && project.previousGap !== undefined
    ? Number(project.previousGap)
    : null;
  const status = determineStatus(gap, real);

  // Status emoji
  let emoji = "🟢";
  if (real >= 100) emoji = "🟣";
  else if (gap < -10) emoji = "🔴";
  else if (gap < 0) emoji = "🟡";
  else if (gap > 5) emoji = "🔵";

  const gapStr = gap > 0 ? `+${gap}%` : `${gap}%`;

  // Trend calculation
  let trendStr = "Sin variación respecto al corte anterior";
  let diffVal = 0;
  if (prevGap !== null && !isNaN(prevGap)) {
    diffVal = Number((gap - prevGap).toFixed(2));
    if (diffVal > 0.1) {
      trendStr = `📈 Mejoró +${diffVal}% respecto al corte anterior (${prevGap > 0 ? `+${prevGap}%` : `${prevGap}%`})`;
    } else if (diffVal < -0.1) {
      trendStr = `📉 Empeoró ${diffVal}% respecto al corte anterior (${prevGap > 0 ? `+${prevGap}%` : `${prevGap}%`})`;
    } else {
      trendStr = `➖ Estable respecto al corte anterior (${prevGap > 0 ? `+${prevGap}%` : `${prevGap}%`})`;
    }
  }

  let text = `📊 REPORTE DE AVANCE DE PROYECTO\n`;
  if (portfolioName) text += `Portafolio: ${portfolioName}\n`;
  text += `Proyecto: ${(project.name || "Proyecto").toUpperCase()}\n`;
  text += `Ing. de proyecto: ${project.manager || "Sin asignar"}\n`;
  text += `Fecha de corte: ${dateFormatted}\n`;
  text += `${"═".repeat(50)}\n\n`;

  text += `📌 ESTADO DEL CRONOGRAMA:\n`;
  text += `• Estado: ${emoji} ${status}\n`;
  text += `• Avance Real: ${real}%\n`;
  text += `• Avance Programado: ${sched}%\n`;
  text += `• Desviación (GAP): ${gapStr}\n`;
  text += `• Tendencia: ${trendStr}\n\n`;

  text += `📌 HITOS DE CONEXIÓN:\n`;
  text += `• Conexión a Red: ${project.connectionState || "Ingeniería"}\n`;
  if (project.fpo) text += `• Fecha FPO: ${formatDate(project.fpo)}\n`;
  text += `\n`;

  text += `💡 DIAGNÓSTICO:\n`;
  if (real >= 100) {
    text += `• Proyecto completado al 100% de ejecución.\n`;
  } else if (gap < -10) {
    text += `• 🚨 Atraso crítico de ${Math.abs(gap)}% que supera el umbral del 10%. Se requiere plan de acción y choque inmediato.\n`;
  } else if (gap < 0) {
    text += `• ⚠️ Proyecto con rezago leve de ${Math.abs(gap)}%. Mantener seguimiento a ruta crítica para evitar paso a atraso crítico.\n`;
  } else if (gap > 5) {
    text += `• 🚀 Avance favorable con ventaja de +${gap}% sobre el cronograma planificado.\n`;
  } else {
    text += `• ✅ Proyecto avanzando en tiempo y alineado con la meta programada.\n`;
  }

  return text;
}
