
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Timestamp } from 'firebase/firestore';

interface SortConfig<T> {
  key: keyof T;
  direction: 'ascending' | 'descending';
}

interface UseSimpleTableProps<T> {
  data: T[]; // Changed from initialData to data
  rowsPerPage?: number;
  searchKeys: (keyof T)[];
  initialSort?: SortConfig<T>;
}

export function useSimpleTable<T>({
  data, // Changed from initialData
  rowsPerPage = 10,
  searchKeys,
  initialSort,
}: UseSimpleTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialSort || null);

  // Reset current page if data length changes, indicating a new dataset or significant filtering.
  useEffect(() => {
    setCurrentPage(0);
  }, [data.length]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data; // Use prop data directly
    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (Array.isArray(value) && value.every(subItem => typeof subItem === 'object' && subItem !== null && 'name' in subItem && typeof subItem.name === 'string')) {
          return value.some(subItem => (subItem as {name: string}).name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return false;
      })
    );
  }, [data, searchTerm, searchKeys]);

  const sortedAndFilteredData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === null || valA === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (valB === null || valB === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'ascending'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
           return sortConfig.direction === 'ascending'
              ? (valA === valB ? 0 : valA ? -1 : 1)
              : (valA === valB ? 0 : valA ? 1 : -1);
        }
        const isDateType = (v: any): v is string | Date | Timestamp =>
            v instanceof Date || (v && typeof (v as Timestamp).toDate === 'function') || typeof v === 'string';

        if (isDateType(valA) && isDateType(valB)) {
            const dateA = valA instanceof Date ? valA : (valA as Timestamp).toDate ? (valA as Timestamp).toDate() : new Date(valA as string);
            const dateB = valB instanceof Date ? valB : (valB as Timestamp).toDate ? (valB as Timestamp).toDate() : new Date(valB as string);

            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return sortConfig.direction === 'ascending' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
            }
        }
        if (String(valA) < String(valB)) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (String(valA) > String(valB)) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const pageCount = Math.ceil(sortedAndFilteredData.length / rowsPerPage);

  const paginatedData = useMemo(() => {
    const start = currentPage * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedAndFilteredData.slice(start, end);
  }, [sortedAndFilteredData, currentPage, rowsPerPage]);

  const requestSort = useCallback((key: keyof T) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, direction });
    setCurrentPage(0);
  }, [sortConfig]);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, pageCount > 0 ? pageCount - 1 : 0));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const goToPage = (pageNumber: number) => {
    setCurrentPage(Math.max(0, Math.min(pageNumber, pageCount > 0 ? pageCount - 1 : 0)));
  };

  const canNextPage = currentPage < (pageCount > 0 ? pageCount - 1 : 0);
  const canPreviousPage = currentPage > 0;

  return {
    paginatedData,
    setSearchTerm,
    searchTerm,
    currentPage,
    setCurrentPage: goToPage,
    pageCount,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    rowsPerPage,
    totalItems: sortedAndFilteredData.length,
    requestSort,
    sortConfig,
    // Removed setDataSource
  };
}
