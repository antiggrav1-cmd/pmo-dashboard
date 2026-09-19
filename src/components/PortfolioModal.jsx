import React, { useState, useEffect } from "react";
import { X, FolderPlus, Check } from "lucide-react";

export function PortfolioModal({ isOpen, portfolio, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: ""
  });

  useEffect(() => {
    if (portfolio) {
      setFormData({
        name: portfolio.name || "",
        code: portfolio.code || "",
        description: portfolio.description || ""
      });
    } else {
      setFormData({
        name: "",
        code: `PORT-${Math.floor(10 + Math.random() * 90)}`,
        description: ""
      });
    }
  }, [portfolio, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSave({
      ...formData,
      id: portfolio ? portfolio.id : `port-${Date.now()}`,
      projects: portfolio ? portfolio.projects : [],
      createdAt: portfolio ? portfolio.createdAt : new Date().toISOString().slice(0, 10)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {portfolio ? "Editar Portafolio" : "Nuevo Portafolio"}
              </h2>
              <p className="text-xs text-slate-500">Organiza un nuevo grupo de proyectos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nombre del Portafolio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Portafolio Transmisión Andina, Solar 2026..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Código / Sigla del Portafolio
            </label>
            <input
              type="text"
              placeholder="Ej: PORT-03 o TRANS-2026"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Descripción u Objetivo
            </label>
            <textarea
              rows={3}
              placeholder="Breve descripción del alcance del portafolio, región geográfica o metas..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {portfolio ? "Actualizar" : "Crear Portafolio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
