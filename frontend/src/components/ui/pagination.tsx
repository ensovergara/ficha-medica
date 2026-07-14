"use client";

import Button from "./button";

interface PaginationProps {
  skip: number;
  limit: number;
  total: number;
  onPageChange: (skip: number) => void;
}

export default function Pagination({ skip, limit, total, onPageChange }: PaginationProps) {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-slate-700">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Mostrando {skip + 1}–{Math.min(skip + limit, total)} de {total}
      </p>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(skip - limit)}>
          &laquo;
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === currentPage ? "primary" : "secondary"}
            onClick={() => onPageChange((p - 1) * limit)}
          >
            {p}
          </Button>
        ))}
        <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(skip + limit)}>
          &raquo;
        </Button>
      </div>
    </div>
  );
}
