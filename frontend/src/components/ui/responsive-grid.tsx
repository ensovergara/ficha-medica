"use client";

import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export default function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "md",
  className,
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: "gap-2 md:gap-3",
    md: "gap-3 md:gap-4",
    lg: "gap-4 md:gap-6",
  };

  const colClasses = cn(
    "grid",
    columns.mobile === 1 && "grid-cols-1",
    columns.mobile === 2 && "grid-cols-2",
    columns.tablet === 1 && "md:grid-cols-1",
    columns.tablet === 2 && "md:grid-cols-2",
    columns.tablet === 3 && "md:grid-cols-3",
    columns.desktop === 2 && "lg:grid-cols-2",
    columns.desktop === 3 && "lg:grid-cols-3",
    columns.desktop === 4 && "lg:grid-cols-4",
    gapClasses[gap]
  );

  return <div className={cn(colClasses, className)}>{children}</div>;
}
