import { useState, useMemo, useCallback } from "react";

export function useProjectFilter(projects = []) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = useCallback((field) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return field;
      } else {
        setSortDirection("asc");
        return field;
      }
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setSortField(null);
  }, []);

  // Filter projects (Memoized)
  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return projects.filter((proj) => {
      const matchSearch =
        !term ||
        (proj.name && proj.name.toLowerCase().includes(term)) ||
        (proj.xm && proj.xm.toLowerCase().includes(term));

      let matchStatus = true;
      if (statusFilter !== "ALL") {
        const s = (proj.status || "").toLowerCase();
        const g = Number(proj.gap) || 0;
        if (statusFilter === "Atrasado") matchStatus = s.includes("atrasad") || g < -10;
        else if (statusFilter === "En riesgo") matchStatus = s.includes("riesgo") || s.includes("rezago") || (g < 0 && g >= -10);
        else if (statusFilter === "En tiempo") matchStatus = s.includes("tiempo") || (g >= 0 && g <= 5);
        else if (statusFilter === "Adelantado") matchStatus = s.includes("adelantad") || g > 5;
        else if (statusFilter === "Completado") matchStatus = s.includes("completad") || Number(proj.realProgress) >= 100;
      }

      return matchSearch && matchStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Sort filtered projects (Memoized)
  const displayedProjects = useMemo(() => {
    if (!sortField) return filteredProjects;

    return [...filteredProjects].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (["realProgress", "scheduledProgress", "gap", "previousGap"].includes(sortField)) {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else if (sortField === "fpo" || sortField === "cod") {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortField, sortDirection]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortField,
    sortDirection,
    handleSort,
    clearFilters,
    displayedProjects,
    totalProjectsCount: projects.length,
    visibleCount: displayedProjects.length
  };
}
