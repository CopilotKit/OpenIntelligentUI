"use client";

import { useRef, useEffect, useState } from "react";
import { THEME_CSS } from "@repo/design-system";

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#f97316",
];

interface TemplateCardProps {
  id: string;
  name: string;
  description: string;
  html: string;
  componentType?: string;
  componentData?: Record<string, unknown>;
  dataDescription: string;
  version: number;
  onApply: (id: string) => void;
  onDelete?: (id: string) => void;
}

/** Mini bar chart preview rendered as inline SVG */
function BarChartPreview({ data }: { data: { label: string; value: number }[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.value));
  const barWidth = Math.min(40, Math.floor(280 / data.length) - 8);
  const chartWidth = data.length * (barWidth + 8);
  const chartHeight = 100;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ padding: 16 }}
    >
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * (chartHeight - 20) : 0;
        return (
          <rect
            key={i}
            x={i * (barWidth + 8)}
            y={chartHeight - h - 10}
            width={barWidth}
            height={h}
            rx={3}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
          />
        );
      })}
    </svg>
  );
}

/** Mini pie chart preview rendered as inline SVG */
function PieChartPreview({ data }: { data: { label: string; value: number }[] }) {
  if (!data?.length) return null;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = 60, cy = 60, r = 50;
  const cumulativeAngles = data.reduce<number[]>((acc, d) => {
    acc.push((acc[acc.length - 1] ?? 0) + d.value);
    return acc;
  }, []);
  const slices = data.map((d, i) => {
    const startAngle = ((cumulativeAngles[i] - d.value) / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulativeAngles[i] / total) * 2 * Math.PI - Math.PI / 2;
    const largeArc = d.value / total > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return (
      <path
        key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
        fill={CHART_COLORS[i % CHART_COLORS.length]}
      />
    );
  });

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {slices}
    </svg>
  );
}

export function TemplateCard({
  id,
  name,
  description,
  html,
  componentType,
  componentData,
  dataDescription,
  version,
  onApply,
  onDelete,
}: TemplateCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingDelete = useRef(false);

  useEffect(() => {
    if (confirmingDelete) {
      cancelDeleteRef.current?.focus();
    } else if (wasConfirmingDelete.current) {
      deleteButtonRef.current?.focus();
    }
    wasConfirmingDelete.current = confirmingDelete;
  }, [confirmingDelete]);

  const previewHtml = html ? `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${THEME_CSS}
* { box-sizing: border-box; margin: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: var(--color-text-primary);
  background: var(--color-background-primary);
  overflow: hidden;
}
</style></head><body><div id="content">${html}</div></body></html>` : "";

  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;
    iframeRef.current.srcdoc = previewHtml;
  }, [previewHtml]);

  // Determine chart data for mini preview
  const chartData = componentData?.data as { label: string; value: number }[] | undefined;
  const isBarChart = componentType === "barChart";
  const isPieChart = componentType === "pieChart";
  const isChart = isBarChart || isPieChart;

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
        background: "var(--surface-primary, #fff)",
      }}
    >
      {/* Preview */}
      <div
        className="relative overflow-hidden"
        style={{ height: 140, background: "var(--color-background-secondary, #f7f6f3)" }}
      >
        {isChart && chartData ? (
          <div className="flex items-center justify-center h-full">
            {isBarChart && <BarChartPreview data={chartData} />}
            {isPieChart && <PieChartPreview data={chartData} />}
          </div>
        ) : html ? (
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            onLoad={() => setPreviewReady(true)}
            className="border-0 w-[300%] h-[300%] origin-top-left"
            style={{
              transform: "scale(0.333)",
              pointerEvents: "none",
              opacity: previewReady ? 1 : 0,
              transition: "opacity 300ms",
            }}
            title={`Preview: ${name}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-tertiary, #999)", opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
        )}
        {/* Version badge */}
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: "var(--color-background-info, #E6F1FB)",
            color: "var(--color-text-info, #185FA5)",
          }}
        >
          v{version}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <h3
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-primary, #1a1a1a)" }}
        >
          {name}
        </h3>
        <p
          className="text-xs line-clamp-2"
          style={{ color: "var(--text-secondary, #666)" }}
        >
          {description}
        </p>
        {dataDescription && (
          <p
            className="text-[10px] mt-1 truncate"
            style={{ color: "var(--text-tertiary, #999)" }}
          >
            Data: {dataDescription}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 pt-0">
        {confirmingDelete && onDelete ? (
          <div
            role="group"
            aria-label={`Delete ${name}?`}
            className="flex flex-col gap-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") setConfirmingDelete(false);
            }}
          >
            <p className="text-xs" style={{ color: "var(--text-secondary, #666)" }}>
              Delete this template? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                ref={cancelDeleteRef}
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg"
                style={{ border: "1px solid var(--color-border-tertiary, rgba(0,0,0,0.1))" }}
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(id)}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg text-white"
                style={{ background: "var(--color-text-danger, #A32D2D)" }}
              >
                Delete template
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onApply(id)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg transition-all duration-150 hover:scale-[1.02] text-white"
              style={{
                background: "linear-gradient(135deg, var(--color-lilac-dark, #6366f1), var(--color-mint-dark, #10b981))",
              }}
            >
              Apply
            </button>
            {onDelete && (
              <button
                ref={deleteButtonRef}
                onClick={() => setConfirmingDelete(true)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors duration-150"
                style={{
                  border: "1px solid var(--color-border-tertiary, rgba(0,0,0,0.1))",
                  color: "var(--color-text-danger, #A32D2D)",
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
