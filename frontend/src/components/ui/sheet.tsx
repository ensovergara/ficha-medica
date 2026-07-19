"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right";
}

export default function Sheet({ open, onClose, children, side = "left" }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const slideDirection = side === "left" ? "-translate-x-full" : "translate-x-full";
  const slideActive = side === "left" ? "translate-x-0" : "translate-x-0";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={cn(
          "fixed inset-y-0 w-64 bg-white dark:bg-slate-800 shadow-lg transition-transform duration-300 ease-in-out overflow-y-auto",
          side === "left" ? "left-0" : "right-0",
          open ? slideActive : slideDirection
        )}
      >
        {children}
      </div>
    </div>
  );
}
