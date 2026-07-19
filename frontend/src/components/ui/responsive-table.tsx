"use client";

import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  className?: string;
}

export default function ResponsiveTable({ headers, rows, className }: ResponsiveTableProps) {
  return (
    <div className={cn("overflow-x-auto -mx-4 md:mx-0", className)}>
      <table className="w-full min-w-full">
        <thead className="hidden md:table-header-group bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-200 dark:border-slate-700 block md:table-row md:border-b mb-4 md:mb-0 rounded-lg md:rounded-none bg-white dark:bg-slate-800 overflow-hidden md:overflow-visible"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="block md:table-cell px-4 py-3 text-sm text-gray-900 dark:text-slate-100 before:content-[attr(data-label)] before:font-semibold before:text-gray-700 before:dark:text-slate-400 before:block md:before:none before:text-xs md:text-sm before:mr-2"
                  data-label={headers[cellIdx]}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
