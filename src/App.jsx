import React, { useState, useCallback, useMemo } from "react";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { DashboardOverview } from "./components/DashboardOverview";
import { ProjectTable } from "./components/ProjectTable";
import { EquipmentTable } from "./components/EquipmentTable";
import { PaymentMilestonesView } from "./components/PaymentMilestonesView";
import { AlertsView } from "./components/AlertsView";
import { BudgetView } from "./components/BudgetView";
import { CommentsView } from "./components/CommentsView";
import { AnderDashboard } from "./components/AnderDashboard";
import { PortfolioModal } from "./components/PortfolioModal";
import { ExcelImportModal } from "./components/ExcelImportModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { ExecutiveReportModal } from "./components/ExecutiveReportModal";
import { ProjectDetailModal } from "./components/ProjectDetailModal";
import { usePortfolios } from "./hooks/usePortfolios";
import { useModal } from "./hooks/useModal";
import { exportToExcel } from "./utils/excelService";
import { getCregRegulatoryRisk, getFpoScheduleRisk, getPendingBillingAlerts } from "./utils/calculations";
import { getAllPortfolioBottlenecks } from "./services/equipmentService";
import { Table, Zap, DollarSign, Bell, Wallet, MessageSquareText } from "lucide-react";

export function App() {
  // Custom Hook: Portfolios & Projects state management
  const {
    portfolios,
    currentPortfolio,
    activePortfolioId,
    syncStatus,
    selectPortfolio,
    updateProject,
    addProject,
    deleteProject,
    savePortfolio,
    deletePortfolio,
    importToCurrentPortfolio,
    importNewPortfolios
  } = usePortfolios();

  // Active View Mode: 'portfolio' | 'ander-dashboard'
  const [viewMode, setViewMode] = useState("portfolio");

  // Active Tab inside the current portfolio: 'projects' | 'equipment' | 'payments' | 'alerts' | 'budget' | 'comments'
  const [activeTab, setActiveTab] = useState("projects");

  // Total comments in current portfolio for tab badge
  const totalComments = useMemo(() => {
    return (currentPortfolio.projects || []).reduce(
      (acc, p) => acc + ((p.comments || []).length),
      0
    );
  }, [currentPortfolio.projects]);

  // Total active alerts in current portfolio (CREG + FPO + Facturación en Trámite + Equipment bottlenecks)
  const totalAlerts = useMemo(() => {
    const projects = currentPortfolio.projects || [];
    const cregCount = projects
      .map((p) => getCregRegulatoryRisk(p))
      .filter((risk) => risk.riskLevel === "CRITICAL" || risk.riskLevel === "WARNING").length;
    const fpoCount = projects
      .map((p) => getFpoScheduleRisk(p))
      .filter((risk) => risk.isAtRisk).length;
    const billingCount = getPendingBillingAlerts(projects).length;
    const bottleneckCount = getAllPortfolioBottlenecks(projects).reduce(
      (acc, item) => acc + (item.bottlenecks || []).length,
      0
    );
    return cregCount + fpoCount + billingCount + bottleneckCount;
  }, [currentPortfolio.projects]);

  // Global search & status filter for Navbar -> ProjectTable
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals management with generic useModal hooks
  const portfolioModal = useModal();
  const importModal = useModal();
  const executiveReportModal = useModal();
  const projectDetailModal = useModal();
  const deleteModal = useModal();

  // Switch to specific portfolio
  const handleSelectPortfolio = useCallback((portfolioId) => {
    selectPortfolio(portfolioId);
    setViewMode("portfolio");
  }, [selectPortfolio]);

  // Export current portfolio to Excel
  const handleExportExcel = useCallback(() => {
    const safeName = (currentPortfolio.name || "Portafolio").replace(/\s+/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel(currentPortfolio, `Reporte_${safeName}_${dateStr}.xlsx`);
  }, [currentPortfolio]);

  // Handle Delete Confirm
  const handleConfirmDelete = useCallback(() => {
    const payload = deleteModal.data;
    if (!payload) return;

    if (payload.type === "project") {
      deleteProject(payload.item.id);
    } else if (payload.type === "portfolio") {
      deletePortfolio(payload.item.id);
    }
    deleteModal.close();
  }, [deleteModal, deleteProject, deletePortfolio]);

  // Request project delete
  const handleDeleteProjectRequest = useCallback((project) => {
    deleteModal.open({
      type: "project",
      item: project,
      title: `Eliminar Fila: ${project.name || "Proyecto"}`,
      message: `¿Estás seguro de que deseas eliminar este proyecto del portafolio "${currentPortfolio.name}"?`
    });
  }, [deleteModal, currentPortfolio.name]);

  // Request portfolio delete
  const handleDeletePortfolioRequest = useCallback((portfolio) => {
    deleteModal.open({
      type: "portfolio",
      item: portfolio,
      title: `Eliminar Portafolio: ${portfolio.name}`,
      message: `¿Estás seguro de que deseas eliminar este portafolio con sus ${(portfolio.projects || []).length} proyectos?`
    });
  }, [deleteModal]);

  const reportPortfolio = viewMode === "ander-dashboard"
    ? {
        id: "dashboard-ander",
        name: "Dashboard General — Consolidado",
        code: "PMO-GLOBAL",
        description: "Informe ejecutivo consolidado de todos los portafolios activos.",
        projects: portfolios.flatMap((portfolio) => (portfolio.projects || []).map((project) => ({
          ...project,
          id: `${portfolio.id}::${project.id}`,
          sourceProjectId: project.id,
          portfolioName: portfolio.name
        })))
      }
    : currentPortfolio;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar: Portfolio list, operations & Dashboard General */}
      <Sidebar
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        isAnderDashboardActive={viewMode === "ander-dashboard"}
        onOpenAnderDashboard={() => setViewMode("ander-dashboard")}
        onSelectPortfolio={handleSelectPortfolio}
        onOpenCreatePortfolio={() => portfolioModal.open(null)}
        onOpenEditPortfolio={(port) => portfolioModal.open(port)}
        onOpenDeletePortfolio={handleDeletePortfolioRequest}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <Navbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onOpenCreateProject={() => {
            if (viewMode === "ander-dashboard" && portfolios.length > 0) {
              setViewMode("portfolio");
            }
            addProject();
          }}
          onOpenImportModal={() => importModal.open()}
          onExportExcel={handleExportExcel}
          onOpenExecutiveReport={() => executiveReportModal.open()}
          currentPortfolioName={viewMode === "ander-dashboard" ? "Dashboard General" : currentPortfolio?.name}
          currentPortfolioAtc={currentPortfolio?.atc}
          isGlobalView={viewMode === "ander-dashboard"}
          syncStatus={syncStatus}
        />

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {viewMode === "ander-dashboard" ? (
            /* Master Health View: Dashboard Ander */
            <AnderDashboard
              portfolios={portfolios}
              onSelectPortfolio={handleSelectPortfolio}
              onOpenCreatePortfolio={() => portfolioModal.open(null)}
              onOpenExecutiveReport={() => executiveReportModal.open({ scope: "global" })}
              onExportExcel={() => {
                const dateStr = new Date().toISOString().slice(0, 10);
                exportToExcel(portfolios, `Reporte_Global_PMO_${dateStr}.xlsx`);
              }}
            />
          ) : (
            /* Portfolio Specific Views */
            <>
              {/* Executive Overview & Progress Chart */}
              <DashboardOverview
                projects={currentPortfolio.projects || []}
                portfolioTitle={currentPortfolio.name}
              />

          {/* Tab Navigation (6 Tabs) */}
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/50 backdrop-blur-xs rounded-2xl border border-slate-200/60 shadow-inner">
              {/* Tab 1: Projects Table */}
              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "projects"
                    ? "bg-navy text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-600 hover:text-navy hover:bg-white/60"
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Cronograma y Avances</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    activeTab === "projects" ? "bg-lemony text-navy shadow-2xs" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {(currentPortfolio.projects || []).length}
                </span>
              </button>

              {/* Tab 2: Alertas */}
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "alerts"
                    ? "bg-navy text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-600 hover:text-navy hover:bg-white/60"
                }`}
              >
                <Bell className={`w-4 h-4 ${activeTab === "alerts" ? "text-lemony" : totalAlerts > 0 ? "text-rose-500" : "text-slate-400"}`} />
                <span>Alertas</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    activeTab === "alerts"
                      ? "bg-rose-500 text-white shadow-2xs"
                      : totalAlerts > 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {totalAlerts}
                </span>
              </button>

              {/* Tab 3: Equipment Tracking */}
              <button
                type="button"
                onClick={() => setActiveTab("equipment")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "equipment"
                    ? "bg-navy text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-600 hover:text-navy hover:bg-white/60"
                }`}
              >
                <Zap className={`w-4 h-4 ${activeTab === "equipment" ? "text-lemony" : "text-amber-500"}`} />
                <span>Equipos Principales</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    activeTab === "equipment" ? "bg-nashville text-navy shadow-2xs" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  5 Equipos
                </span>
              </button>

              {/* Tab 4: Presupuesto */}
              <button type="button" onClick={() => setActiveTab("budget")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "budget" ? "bg-navy text-white shadow-sm" : "text-slate-600 hover:text-navy hover:bg-white/60"}`}>
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Presupuesto</span>
              </button>

              {/* Tab 5: Payment Milestones (Facturación) */}
              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "payments"
                    ? "bg-navy text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-600 hover:text-navy hover:bg-white/60"
                }`}
              >
                <DollarSign className={`w-4 h-4 ${activeTab === "payments" ? "text-lemony" : "text-emerald-600"}`} />
                <span>Hitos de Pago (Facturación)</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    activeTab === "payments" ? "bg-lemony text-navy shadow-2xs" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  Cobros
                </span>
              </button>

              {/* Tab 6: Comentarios y Observaciones */}
              <button
                type="button"
                onClick={() => setActiveTab("comments")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "comments"
                    ? "bg-navy text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-600 hover:text-navy hover:bg-white/60"
                }`}
              >
                <MessageSquareText className={`w-4 h-4 ${activeTab === "comments" ? "text-lemony" : "text-sky-600"}`} />
                <span>Comentarios y Observaciones</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    activeTab === "comments" ? "bg-lemony text-navy shadow-2xs" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {totalComments}
                </span>
              </button>
            </div>
          </div>

          {/* Tab 1: Cronograma y Avances */}
          {activeTab === "projects" && (
            <ProjectTable
              projects={currentPortfolio.projects || []}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onUpdateProject={updateProject}
              onDeleteProject={handleDeleteProjectRequest}
              onAddProject={() => addProject()}
              onOpenProjectDetail={(project) => projectDetailModal.open(project)}
            />
          )}

          {/* Tab 2: Matriz de Equipos Principales */}
          {activeTab === "equipment" && (
            <EquipmentTable
              projects={currentPortfolio.projects || []}
              portfolioName={currentPortfolio.name}
              onUpdateProject={updateProject}
            />
          )}

          {/* Tab 3: Hitos de Pago (Facturación) */}
          {activeTab === "payments" && (
            <PaymentMilestonesView
              projects={currentPortfolio.projects || []}
              portfolioName={currentPortfolio.name}
              onUpdateProject={updateProject}
              onOpenProjectDetail={(project) => projectDetailModal.open(project)}
            />
          )}
          {activeTab === "budget" && (
            <BudgetView 
              projects={currentPortfolio.projects || []} 
              onUpdateProject={updateProject} 
              onOpenProjectDetail={(project) => projectDetailModal.open(project)}
            />
          )}
          {activeTab === "alerts" && <AlertsView projects={currentPortfolio.projects || []} />}
          {activeTab === "comments" && (
            <CommentsView
              projects={currentPortfolio.projects || []}
              portfolioName={currentPortfolio.name}
              onUpdateProject={updateProject}
            />
          )}
            </>
          )}
        </main>
      </div>

      {/* Modals Layer */}
      <PortfolioModal
        isOpen={portfolioModal.isOpen}
        portfolio={portfolioModal.data}
        onSave={savePortfolio}
        onClose={portfolioModal.close}
      />

      <ExcelImportModal
        isOpen={importModal.isOpen}
        currentPortfolio={currentPortfolio}
        onImportToCurrent={importToCurrentPortfolio}
        onImportAsNewPortfolios={importNewPortfolios}
        onClose={importModal.close}
      />

      <ExecutiveReportModal
        isOpen={executiveReportModal.isOpen}
        portfolio={reportPortfolio}
        isGlobal={viewMode === "ander-dashboard"}
        portfolios={portfolios}
        initialProjectId={executiveReportModal.data?.projectId || ""}
        onUpdateProject={updateProject}
        onClose={executiveReportModal.close}
      />

      <ProjectDetailModal
        isOpen={projectDetailModal.isOpen}
        project={projectDetailModal.data}
        onSave={updateProject}
        onClose={projectDetailModal.close}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.data?.title || "Confirmar eliminación"}
        message={deleteModal.data?.message || "¿Deseas eliminar este elemento?"}
        onConfirm={handleConfirmDelete}
        onCancel={deleteModal.close}
      />
    </div>
  );
}

export default App;
