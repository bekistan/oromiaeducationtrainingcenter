
'use client';

import { useState, useMemo, useEffect } from 'react';

interface UseSimpleTableProps<T> {
  initialData: T[];
  rowsPerPage?: number;
  searchKeys: (keyof T)[]; // Keys to search within each item for string/number values
  // Add more complex search logic if needed, e.g., for nested objects or arrays
}

export function useSimpleTable<T>({
  initialData,
  rowsPerPage = 10,
  searchKeys,
}: UseSimpleTableProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed

  useEffect(() => {
    setData(initialData);
    setCurrentPage(0); // Reset to first page when initialData changes
  }, [initialData]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        }
        // Handle array of strings (like item names in bookings)
        if (Array.isArray(value) && value.every(subItem => typeof subItem === 'object' && subItem !== null && 'name' in subItem && typeof subItem.name === 'string')) {
          return value.some(subItem => (subItem as {name: string}).name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return false;
      })
    );
  }, [data, searchTerm, searchKeys]);

  const pageCount = Math.ceil(filteredData.length / rowsPerPage);

  const paginatedData = useMemo(() => {
    const start = currentPage * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, rowsPerPage]);

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
    totalItems: filteredData.length,
    setDataSource: setData, // Allow updating the source data if needed externally
  };
}
