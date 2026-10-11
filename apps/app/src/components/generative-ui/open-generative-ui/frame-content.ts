import { TRIP_ANIMATOR_SCRIPT } from "./trip-animator";
import {
  THEME_CSS,
  SVG_CLASSES_CSS,
  FORM_STYLES_WITH_STAGGER_CSS,
  IMPORTMAP_SCRIPT_TAG,
} from "@repo/design-system";

export const RESIZE_MESSAGE_TYPE = "__ogui_resize";

export const PREVIEW_FRAME_CONTENT = "<head></head><body></body>";

const DESIGN_SYSTEM_CSS = `${THEME_CSS}\n${SVG_CLASSES_CSS}\n${FORM_STYLES_WITH_STAGGER_CSS}`;
const DESIGN_SYSTEM_STYLE_TAG = `<style>${DESIGN_SYSTEM_CSS}</style>`;
const OVERFLOW_HIDDEN_STYLE_TAG =
  "<style>html, body { overflow: hidden !important; }</style>";

// CSP for the final sandbox document, carried over from the legacy widget
// renderer shell and matching the CDN allowlist documented in the
// advanced-visualization skill ("CSP-enforced"). 'unsafe-inline' covers the
// websandbox bootstrap and sandbox.run-injected scripts; script-src and
// connect-src are restricted to the four CDN origins so generated code cannot
// load from arbitrary origins. Map images may use the explicit USGS tile host.
export const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval'
      https://cdnjs.cloudflare.com
      https://esm.sh
      https://cdn.jsdelivr.net
      https://unpkg.com;
    style-src 'unsafe-inline';
    img-src 'self' data: blob: https://basemap.nationalmap.gov https://upload.wikimedia.org https://thumb.wikimedia.org;
    font-src 'self' data:;
    connect-src 'self'
      https://cdnjs.cloudflare.com
      https://esm.sh
      https://cdn.jsdelivr.net
      https://unpkg.com;
  ">`;

const HEAD_OPEN_TAG = /<head(?:\s[^>]*)?>/i;

/**
 * Websandbox requires a literal lowercase "<head>" in its frame content and
 * injects its bootstrap there, so "<HEAD>" or "<head lang=...>" is normalized
 * (attributes on <head> have no effect) and a missing head is added.
 */
export function ensureHead(html: string): string {
  if (html.includes("<head>")) return html;
  if (HEAD_OPEN_TAG.test(html)) return html.replace(HEAD_OPEN_TAG, "<head>");
  return `<head></head>${html}`;
}

/**
 * Final sandbox document: CSP meta first, then importmap (must precede any
 * scripts so module resolution works), then design-system styles, then the
 * generated css, then the generated html. Head content is injected right
 * after the opening <head> tag so it precedes anything the generated document
 * put in its own head.
 */
export function buildFinalFrameContent(html: string, css?: string): string {
  const headContent =
    CSP_META_TAG +
    IMPORTMAP_SCRIPT_TAG +
    TRIP_ANIMATOR_SCRIPT +
    DESIGN_SYSTEM_STYLE_TAG +
    (css ? `<style>${css}</style>` : "");
  const withHead = ensureHead(html);
  const insertAt = withHead.indexOf("<head>") + "<head>".length;
  return withHead.slice(0, insertAt) + headContent + withHead.slice(insertAt);
}

/**
 * Preview sandbox head: design-system styles, the generated css param, and any
 * complete <style> tags already extracted from the partial html.
 */
export function buildPreviewHeadContent(
  css?: string,
  previewStyles?: string
): string {
  const parts = [OVERFLOW_HIDDEN_STYLE_TAG, DESIGN_SYSTEM_STYLE_TAG];
  if (css) parts.push(`<style>${css}</style>`);
  if (previewStyles) parts.push(previewStyles);
  return parts.join("");
}

/**
 * Preview body update: morph via Idiomorph (preserves existing nodes, no
 * flicker), falling back to a plain innerHTML assignment if Idiomorph is
 * unavailable or throws. New element nodes are tagged with morph-enter
 * (legacy bridge parity) so the design system's fadeSlideIn animation plays
 * as streamed content appears. (The #content.initial-render stagger rules in
 * FORM_STYLES_WITH_STAGGER_CSS apply only to documents that wrap content in
 * #content — i.e. the MCP rail — and are inert here.)
 */
export function buildPreviewBodyMorph(body: string): string {
  return `(function() {
  var html = ${JSON.stringify(body)};
  if (typeof Idiomorph !== "undefined" && Idiomorph && Idiomorph.morph) {
    try {
      Idiomorph.morph(document.body, html, {
        morphStyle: 'innerHTML',
        callbacks: {
          beforeNodeAdded: function(node) {
            if (node.nodeType === 1) {
              node.classList.add('morph-enter');
              node.addEventListener('animationend', function() {
                node.classList.remove('morph-enter');
              }, { once: true });
            }
          }
        }
      });
    } catch (err) {
      document.body.innerHTML = html;
    }
  } else {
    document.body.innerHTML = html;
  }
})();`;
}

/**
 * Continuous autosize, forked from the legacy widget renderer bridge: a
 * ResizeObserver on document.body plus a window resize listener report the
 * content height to the parent on every change. Body height is forced to auto
 * so the reading can shrink below the current iframe viewport.
 */
export const MEASUREMENT_JS = `
(function() {
  if (window.__oguiResizeInstalled) return;
  window.__oguiResizeInstalled = true;
  var style = document.createElement('style');
  style.textContent = 'html, body { overflow: hidden !important; height: auto !important; min-height: 0 !important; }';
  document.head.appendChild(style);
  function reportHeight() {
    var h = document.body.scrollHeight;
    var cs = getComputedStyle(document.body);
    h += parseFloat(cs.marginTop) || 0;
    h += parseFloat(cs.marginBottom) || 0;
    parent.postMessage({ type: '${RESIZE_MESSAGE_TYPE}', height: Math.ceil(h) }, '*');
  }
  var ro = new ResizeObserver(reportHeight);
  ro.observe(document.body);
  window.addEventListener('resize', reportHeight);
  window.addEventListener('load', reportHeight);
  var interval = setInterval(reportHeight, 200);
  setTimeout(function() { clearInterval(interval); }, 3000);
  reportHeight();
})();
`;
