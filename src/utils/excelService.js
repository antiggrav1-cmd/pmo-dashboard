import * as XLSX from "xlsx";
import { calculateGap, determineStatus, formatDate } from "./calculations";
import { getDefaultEquipment } from "./equipmentConstants";

/**
 * Export single portfolio or multiple portfolios to Excel
 */
export function exportToExcel(portfolioOrList, filename = "Reporte_PMO_Proyectos.xlsx") {
  const wb = XLSX.utils.book_new();

  const portfolios = Array.isArray(portfolioOrList) ? portfolioOrList : [portfolioOrList];

  portfolios.forEach((portfolio, idx) => {
    // Sheet 1: Projects Overview
    const projectRows = (portfolio.projects || []).map((p) => ({
      "XM": p.xm || "",
      "Proyecto": p.name || "",
      "FPO": formatDate(p.fpo),
      "COD": formatDate(p.cod),
      "CREG": formatDate(p.creg),
      "Avance Real (%)": p.realProgress !== undefined ? p.realProgress : 0,
      "Avance Programado (%)": p.scheduledProgress !== undefined ? p.scheduledProgress : 0,
      "GAP (%)": p.gap !== undefined ? p.gap : 0,
      "GAP anterior (%)": p.previousGap !== undefined ? p.previousGap : 0,
      "Estado": p.status || "En tiempo",
      "Observaciones": p.notes || ""
    }));

    const wsProjects = XLSX.utils.json_to_sheet(projectRows);

    wsProjects["!cols"] = [
      { wch: 22 }, // XM
      { wch: 28 }, // Proyecto
      { wch: 14 }, // FPO
      { wch: 14 }, // COD
      { wch: 14 }, // CREG
      { wch: 18 }, // Avance Real (%)
      { wch: 22 }, // Avance Programado (%)
      { wch: 12 }, // GAP (%)
      { wch: 16 }, // GAP anterior (%)
      { wch: 15 }, // Estado
      { wch: 35 }, // Observaciones
    ];

    const baseName = (portfolio.name || `Portafolio ${idx + 1}`).replace(/[\\/?*[\]:]/g, "");
    const cronogramaSuffix = " - Cronograma";
    const equipmentSuffix = " - Equipos";
    const cronogramaName = `${baseName.slice(0, 31 - cronogramaSuffix.length)}${cronogramaSuffix}`;
    const equipmentName = `${baseName.slice(0, 31 - equipmentSuffix.length)}${equipmentSuffix}`;
    XLSX.utils.book_append_sheet(wb, wsProjects, cronogramaName);

    // Sheet 2: Equipment Tracking
    const equipmentRows = (portfolio.projects || []).map((p) => {
      const eq = p.equipment || getDefaultEquipment();
      return {
        "Proyecto": p.name || "",
        "Paneles (Estado)": eq.paneles?.status || "FabricaciÃ³n",
        "Paneles ETA": formatDate(eq.paneles?.eta),
        "Paneles Marca": eq.paneles?.brand || "",

        "Tracker (Estado)": eq.trackers?.status || "FabricaciÃ³n",
        "Tracker ETA": formatDate(eq.trackers?.eta),
        "Tracker Marca": eq.trackers?.brand || "",

        "Shelter (Estado)": eq.shelter?.status || "FabricaciÃ³n",
        "Shelter ETA": formatDate(eq.shelter?.eta),
        "Shelter Marca": eq.shelter?.brand || "",

        "Inversores (Estado)": eq.inversores?.status || "FabricaciÃ³n",
        "Inversores ETA": formatDate(eq.inversores?.eta),
        "Inversores Marca": eq.inversores?.brand || "",

        "Reconectador (Estado)": eq.reconectador?.status || "FabricaciÃ³n",
        "Reconectador ETA": formatDate(eq.reconectador?.eta),
        "Reconectador Marca": eq.reconectador?.brand || "",
      };
    });

    const wsEquipment = XLSX.utils.json_to_sheet(equipmentRows);
    wsEquipment["!cols"] = Array(16).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, wsEquipment, equipmentName);
  });

  XLSX.writeFile(wb, filename);
}

/**
 * Parses raw Excel file buffer into structured projects
 */
export function parseExcelFile(dataBuffer) {
  const wb = XLSX.read(dataBuffer, { type: "array", cellDates: true });
  const sheetNames = wb.SheetNames;
  const resultSheets = [];

  sheetNames.forEach((sheetName, sheetIndex) => {
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rawRows || rawRows.length === 0) return;

    const projects = rawRows.map((row, idx) => {
      const findVal = (possibleKeys) => {
        for (const k of Object.keys(row)) {
          const lowerK = k.toLowerCase().trim();
          for (const pk of possibleKeys) {
            if (lowerK.includes(pk.toLowerCase())) return row[k];
          }
        }
        return "";
      };

      const parseNumber = (val) => {
        if (typeof val === "number") {
          return val <= 1 && val > 0 ? Number((val * 100).toFixed(2)) : Number(val.toFixed(2));
        }
        if (!val) return 0;
        const cleaned = String(val).replace("%", "").replace(",", ".").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Number(num.toFixed(2));
      };

      const parseDateVal = (val) => {
        if (!val) return "";
        if (val instanceof Date && !isNaN(val.getTime())) {
          return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
        }
        const str = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const parts = str.split(/[/-]/);
        if (parts.length === 3 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
        return str;
      };

      const name = findVal(["proyecto", "project", "nombre", "obra"]) || `Proyecto ${idx + 1}`;
      const xm = findVal(["xm", "documento", "archivo", "informe", "pdf", "link", "enlace"]) || "";
      const fpo = parseDateVal(findVal(["fpo", "puesta en operacion", "fecha fpo"]));
      const cod = parseDateVal(findVal(["cod", "comercial", "fecha cod"]));
      const creg = parseDateVal(findVal(["creg", "fecha creg", "resolucion creg"]));
      const realProgress = parseNumber(findVal(["avance real", "real", "% real"]));
      const scheduledProgress = parseNumber(findVal(["avance programado", "programado", "% prog"]));
      
      const rawGap = findVal(["gap (%)", "gap", "desviacion"]);
      const gap = rawGap !== "" ? parseNumber(rawGap) : calculateGap(realProgress, scheduledProgress);
      
      const rawPrevGap = findVal(["gap anterior", "anterior", "previo"]);
      const previousGap = rawPrevGap !== "" ? parseNumber(rawPrevGap) : gap;

      const status = determineStatus(gap, realProgress);
      const notes = findVal(["observaciones", "notas", "comentarios", "detalle"]);
      const manager = findVal(["responsable", "lider", "director", "manager"]);

      return {
        id: `proj-import-${Date.now()}-${sheetIndex}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        xm: typeof xm === "string" ? xm : String(xm),
        name: String(name),
        fpo: fpo,
        cod: cod,
        creg: creg,
        realProgress,
        scheduledProgress,
        gap,
        previousGap,
        status: String(status),
        notes: String(notes),
        manager: String(manager),
        equipment: getDefaultEquipment()
      };
    });

    resultSheets.push({
      sheetName,
      projects
    });
  });

  return resultSheets;
}
