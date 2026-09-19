import { INITIAL_PORTFOLIOS } from "../data/initialData";

const STORAGE_KEY = "pmo_portfolios_v1";

export function loadPortfolios() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error loading portfolios from localStorage:", error);
  }
  // Return default data if storage is empty
  savePortfolios(INITIAL_PORTFOLIOS);
  return INITIAL_PORTFOLIOS;
}

export function savePortfolios(portfolios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
  } catch (error) {
    console.error("Error saving portfolios to localStorage:", error);
  }
}

export function resetToDefaultData() {
  savePortfolios(INITIAL_PORTFOLIOS);
  return INITIAL_PORTFOLIOS;
}

export function exportAllDataAsJSON(portfolios) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolios, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `PMO_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
