"use client";

import { useState, useEffect } from "react";
import { DEMO_EXAMPLES, type DemoCategory, type DemoItem } from "./demo-data";
import { DemoCard } from "./demo-card";
import { CategoryFilter } from "./category-filter";
import { GridIcon } from "./grid-icon";

export type { DemoItem } from "./demo-data";

interface DemoGalleryProps {
  open: boolean;
  onClose: () => void;
  onTryDemo: (demo: DemoItem) => void;
}

export function DemoGallery({ open, onClose, onTryDemo }: DemoGalleryProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<DemoCategory | null>(null);

  const filtered = selectedCategory
    ? DEMO_EXAMPLES.filter((d) => d.category === selectedCategory)
    : DEMO_EXAMPLES;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      {/* Drawer: full-screen bottom sheet on mobile, right side panel on sm+ */}
      <div
        inert={!open}
        aria-hidden={!open}
        className={`demo-gallery-drawer fixed z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "demo-gallery-drawer--open" : ""}`}
        style={{ background: "var(--surface-primary, #fff)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 shrink-0"
          style={{
            borderBottom:
              "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
          }}
        >
          <div className="flex items-center gap-2">
            <GridIcon size={18} style={{ color: "var(--text-secondary, #666)" }} />
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary, #1a1a1a)" }}
            >
              Demo Gallery
            </h2>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-background-secondary, #f5f5f5)",
                color: "var(--text-secondary, #666)",
              }}
            >
              {DEMO_EXAMPLES.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg transition-colors duration-150 cursor-pointer"
            style={{ color: "var(--text-secondary, #666)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Category filter */}
        <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-2 shrink-0">
          <CategoryFilter
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-5 overscroll-contain">
          <div className="flex flex-col gap-3 pt-2">
            {filtered.map((demo) => (
              <DemoCard key={demo.id} demo={demo} onTry={onTryDemo} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary, #666)" }}
              >
                No demos in this category
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
