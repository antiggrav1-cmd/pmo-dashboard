import { useState, useMemo, useCallback } from "react";

/**
 * Reusable table sorting hook
 * @param {Array} items - Array of objects to sort
 * @param {Object} options - Configuration options
 * @param {string|null} options.defaultField - Initial sort field
 * @param {string} options.defaultDirection - 'asc' or 'desc'
 * @param {Object} options.customGetters - Custom value extraction functions per field
 */
export function useTableSort(items = [], options = {}) {
  const {
    defaultField = null,
    defaultDirection = "asc",
    customGetters = {}
  } = options;

  const [sortConfig, setSortConfig] = useState({
    field: defaultField,
    direction: defaultDirection
  });

  const handleSort = useCallback((field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc"
        };
      }
      return {
        field,
        direction: "asc"
      };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortConfig({
      field: null,
      direction: "asc"
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortConfig.field || !Array.isArray(items) || items.length === 0) return items;
    const { field: sortField, direction: sortDirection } = sortConfig;

    return [...items].sort((a, b) => {
      let valA, valB;

      if (customGetters && typeof customGetters[sortField] === "function") {
        try {
          valA = customGetters[sortField](a);
        } catch {
          valA = undefined;
        }
        try {
          valB = customGetters[sortField](b);
        } catch {
          valB = undefined;
        }
      } else {
        valA = a ? a[sortField] : undefined;
        valB = b ? b[sortField] : undefined;
      }

      // 1. Handle empty / null / undefined / NaN - push them to the end
      const isNullA = valA === undefined || valA === null || valA === "" || (typeof valA === "number" && isNaN(valA));
      const isNullB = valB === undefined || valB === null || valB === "" || (typeof valB === "number" && isNaN(valB));

      const tieBreaker = () => {
        const nameA = String(a?.name || a?.id || "").toLowerCase();
        const nameB = String(b?.name || b?.id || "").toLowerCase();
        return nameA.localeCompare(nameB, "es", { numeric: true, sensitivity: "base" });
      };

      if (isNullA && isNullB) return tieBreaker();
      if (isNullA) return 1; // A is empty, goes after B
      if (isNullB) return -1; // B is empty, goes after A

      // 2. Date comparison
      const isDateField = ["fpo", "cod", "creg", "eta", "gridConnectionDate", "submittedAt", "date"].includes(sortField);
      const isDatePattern = typeof valA === "string" && typeof valB === "string" && /^\d{4}-\d{2}-\d{2}/.test(valA) && /^\d{4}-\d{2}-\d{2}/.test(valB);

      if (isDateField || isDatePattern) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        const validA = !isNaN(timeA);
        const validB = !isNaN(timeB);

        if (validA && validB) {
          if (timeA === timeB) return tieBreaker();
          return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
        }
        if (!validA && !validB) return tieBreaker();
        if (!validA) return 1;
        if (!validB) return -1;
      }

      // 3. Numeric comparison
      const numA = typeof valA === "number" ? valA : (typeof valA === "string" && valA.trim() !== "" && !isNaN(Number(valA))) ? Number(valA) : NaN;
      const numB = typeof valB === "number" ? valB : (typeof valB === "string" && valB.trim() !== "" && !isNaN(Number(valB))) ? Number(valB) : NaN;

      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA === numB) return tieBreaker();
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // 4. String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      const cmp = strA.localeCompare(strB, "es", { numeric: true, sensitivity: "base" });
      return cmp !== 0 ? (sortDirection === "asc" ? cmp : -cmp) : tieBreaker();
    });
  }, [items, sortConfig, customGetters]);

  return {
    sortField: sortConfig.field,
    sortDirection: sortConfig.direction,
    handleSort,
    resetSort,
    sortedItems
  };
}

