import { TRIP_ANIMATOR_SCRIPT } from "./open-generative-ui/trip-animator";
import {
  THEME_CSS,
  SVG_CLASSES_CSS,
  FORM_STYLES_WITH_STAGGER_CSS as FORM_STYLES_CSS,
  IMPORTMAP_SCRIPT_TAG,
} from "@repo/design-system";

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
];

export interface StandaloneActivityContent {
  css?: string;
  html?: string[];
  jsFunctions?: string;
  jsExpressions?: string[];
}

const WEBSANDBOX_STUB = `window.Websandbox = { connection: { remote: { sendPrompt: async () => {}, openLink: async ({ url }) => { if (/^https:/.test(url)) window.open(url, "_blank", "noopener,noreferrer"); } } } };`;

function escapeScriptClose(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

function escapeStyleClose(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

/**
 * Wrap an open-generative-ui activity payload in a standalone document that
 * works when opened in a browser: importmap first, then the same design-system
 * css composition the live renderer injects, then the generated css, a
 * Websandbox stub so exported bridge calls degrade gracefully, the joined html
 * chunks, and finally the generated js in ONE classic (non-module) script:
 * jsFunctions at top level — so function declarations become window globals,
 * matching the live websandbox rail where inline onclick="fn()" handlers
 * resolve them — followed by the jsExpressions inside an async IIFE so they
 * can use `await` (dynamic import() still resolves via the importmap in
 * classic scripts).
 */
export function assembleStandaloneHtmlFromActivity(
  content: StandaloneActivityContent,
  title = "generated-widget"
): string {
  const body = content.html?.join("") ?? "";
  const expressions = content.jsExpressions ?? [];
  const scriptParts = [
    ...(content.jsFunctions ? [escapeScriptClose(content.jsFunctions)] : []),
    ...(expressions.length > 0
      ? [
          `(async () => {
${expressions.map(escapeScriptClose).join("\n")}
})();`,
        ]
      : []),
  ];
  const generatedScript =
    scriptParts.length > 0
      ? `<script>
${scriptParts.join("\n")}
  </script>`
      : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${IMPORTMAP_SCRIPT_TAG}
  ${TRIP_ANIMATOR_SCRIPT}
  <style>
    ${THEME_CSS}
    ${SVG_CLASSES_CSS}
    ${FORM_STYLES_CSS}
  </style>${content.css ? `\n  <style>${escapeStyleClose(content.css)}</style>` : ""}
  <script>${WEBSANDBOX_STUB}</script>
</head>
<body>
  ${body}
  ${generatedScript}
</body>
</html>`;
}

/**
 * Generate a standalone HTML file that renders a chart using Chart.js from CDN.
 */
export function chartToStandaloneHtml(
  type: "bar" | "pie",
  data: { title: string; description: string; data: Array<{ label: string; value: number }> }
): string {
  const labels = JSON.stringify(data.data.map((d) => d.label));
  const values = JSON.stringify(data.data.map((d) => d.value));
  const colors = JSON.stringify(
    data.data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
  );

  const chartConfig =
    type === "bar"
      ? `{
        type: 'bar',
        data: {
          labels: ${labels},
          datasets: [{
            data: ${values},
            backgroundColor: ${colors},
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 8, padding: 10 }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(0,0,0,0.06)' } }
          }
        }
      }`
      : `{
        type: 'pie',
        data: {
          labels: ${labels},
          datasets: [{
            data: ${values},
            backgroundColor: ${colors},
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
            tooltip: { backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 8, padding: 10 }
          }
        }
      }`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.title)}</title>
  <style>
    ${THEME_CSS}
    body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; max-width: 640px; margin: 0 auto; }
    h3 { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: var(--color-text-primary); }
    p { font-size: 14px; color: var(--color-text-secondary); margin: 0 0 20px; }
    canvas { max-height: 360px; }
  </style>
</head>
<body>
  <h3>${escapeHtml(data.title)}</h3>
  <p>${escapeHtml(data.description)}</p>
  <canvas id="chart"></canvas>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <script>
    new Chart(document.getElementById('chart'), ${chartConfig});
  </script>
</body>
</html>`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function triggerDownload(htmlString: string, filename: string): void {
  const blob = new Blob([htmlString], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
