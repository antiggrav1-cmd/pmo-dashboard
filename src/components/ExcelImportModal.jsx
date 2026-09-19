import React, { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { parseExcelFile } from "../utils/excelService";

export function ExcelImportModal({ isOpen, currentPortfolio, onImportToCurrent, onImportAsNewPortfolios, onClose }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [targetMode, setTargetMode] = useState("current"); // "current" or "new"
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg("");
    setFile(selected);
    setIsProcessing(true);

    try {
      const buffer = await selected.arrayBuffer();
      const sheets = parseExcelFile(buffer);
      if (!sheets || sheets.length === 0 || sheets.every((s) => s.projects.length === 0)) {
        setErrorMsg("No se encontraron filas de proyectos válidas en el archivo.");
        setParsedData(null);
      } else {
        setParsedData(sheets);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al leer el archivo de Excel. Asegúrate de que tenga formato .xlsx o .csv válido.");
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedData) return;

    if (targetMode === "current") {
      // Flatten all projects into current portfolio
      const allProjects = parsedData.flatMap((s) => s.projects);
      onImportToCurrent(allProjects);
    } else {
      // Create a new portfolio per sheet
      const newPortfolios = parsedData.map((sheet, idx) => ({
        id: `port-import-${Date.now()}-${idx}`,
        name: sheet.sheetName === "Sheet1" ? `Portafolio Importado ${new Date().toLocaleDateString()}` : sheet.sheetName,
        code: `PORT-IMP${idx + 1}`,
        description: `Importado desde archivo ${file?.name}`,
        createdAt: new Date().toISOString().slice(0, 10),
        projects: sheet.projects
      }));
      onImportAsNewPortfolios(newPortfolios);
    }
    onClose();
  };

  const totalProjectsFound = parsedData ? parsedData.reduce((acc, s) => acc + s.projects.length, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Importar desde Excel (.xlsx / .csv)</h2>
              <p className="text-xs text-slate-500">Carga tus tablas de proyectos automáticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              file ? "border-emerald-400 bg-emerald-50/40" : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 bg-white shadow-xs rounded-full border border-slate-200 text-emerald-600">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {file ? file.name : "Haz clic para seleccionar tu archivo Excel"}
              </p>
              <p className="text-xs text-slate-500">
                Soporta columnas: XM, Proyecto, FPO, COD, Avance Real, Avance Programado, GAP, Estado
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Import Destination Options */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  ¿Dónde deseas importar estos proyectos?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      targetMode === "current"
                        ? "bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white/60 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      value="current"
                      checked={targetMode === "current"}
                      onChange={() => setTargetMode("current")}
                      className="mt-1 text-emerald-600"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">
                        Al Portafolio Actual
                      </span>
                      <span className="text-xs text-slate-500 block truncate max-w-[200px]">
                        "{currentPortfolio?.name || "Portafolio Activo"}"
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      targetMode === "new"
                        ? "bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white/60 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      value="new"
                      checked={targetMode === "new"}
                      onChange={() => setTargetMode("new")}
                      className="mt-1 text-emerald-600"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">
                        Como Nuevo Portafolio
                      </span>
                      <span className="text-xs text-slate-500 block">
                        Crea {parsedData.length} portafolio(s) por hoja
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Vista previa ({totalProjectsFound} proyectos encontrados)
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">Proyecto</th>
                        <th className="p-2">FPO</th>
                        <th className="p-2">COD</th>
                        <th className="p-2 text-right">Real %</th>
                        <th className="p-2 text-right">Prog %</th>
                        <th className="p-2 text-right">GAP %</th>
                        <th className="p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData
                        .flatMap((s) => s.projects)
                        .slice(0, 8)
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-800">{p.name}</td>
                            <td className="p-2 text-slate-600">{p.fpo || "-"}</td>
                            <td className="p-2 text-slate-600">{p.cod || "-"}</td>
                            <td className="p-2 text-right font-medium">{p.realProgress}%</td>
                            <td className="p-2 text-right text-slate-500">{p.scheduledProgress}%</td>
                            <td
                              className={`p-2 text-right font-bold ${
                                p.gap < 0 ? "text-rose-600" : "text-emerald-600"
                              }`}
                            >
                              {p.gap}%
                            </td>
                            <td className="p-2 text-slate-700">{p.status}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {totalProjectsFound > 8 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 font-medium">
                      + {totalProjectsFound - 8} proyectos más...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!parsedData || isProcessing}
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Importar {totalProjectsFound} Proyectos
          </button>
        </div>
      </div>
    </div>
  );
}
