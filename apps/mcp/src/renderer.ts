// OpenIntelligentUI document assembly for the MCP server.
// Design-system CSS is single-sourced from @repo/design-system.

import { THEME_CSS, SVG_CLASSES_CSS, FORM_STYLES_CSS } from "@repo/design-system";

// Origins generated UI may load scripts and assets from, in both rendering paths.
export const CDN_ORIGINS = [
  "https://cdnjs.cloudflare.com",
  "https://esm.sh",
  "https://cdn.jsdelivr.net",
  "https://unpkg.com",
];

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

// ponytail: the view loads the MCP Apps SDK from jsDelivr when it opens, so rendering
// needs network access; inline app-with-deps.js into the view if offline hosts matter.
const EXT_APPS_SDK_URL =
  "https://cdn.jsdelivr.net/npm/@modelcontextprotocol/ext-apps@2.0.3/dist/src/app-with-deps.js";

const BRIDGE_JS = `
window.sendPrompt = function(text) {
  window.parent.postMessage({ type: 'send-prompt', text: text }, '*');
};
window.openLink = function(url) {
  window.parent.postMessage({ type: 'open-link', url: url }, '*');
};
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href]');
  if (a && a.href.startsWith('http')) {
    e.preventDefault();
    window.parent.postMessage({ type: 'open-link', url: a.href }, '*');
  }
});
function reportHeight() {
  var content = document.getElementById('content');
  var h = content ? content.offsetHeight : document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
}
var ro = new ResizeObserver(reportHeight);
ro.observe(document.getElementById('content') || document.body);
window.addEventListener('load', reportHeight);
var _resizeInterval = setInterval(reportHeight, 200);
setTimeout(function() { clearInterval(_resizeInterval); }, 15000);
`;

export function assembleDocument(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval' ${CDN_ORIGINS.join(" ")};
    style-src 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self';
  ">
  <style>
    ${THEME_CSS}
    ${SVG_CLASSES_CSS}
    ${FORM_STYLES_CSS}
  </style>
</head>
<body>
  <div id="content">
    ${html}
  </div>
  <script>
    ${BRIDGE_JS}
  </script>
</body>
</html>`;
}

// MCP Apps view for assemble_document. The host renders it in a sandboxed iframe
// and delivers the tool arguments, so the fragment arrives as args.html.
export const MCP_APP_VIEW_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <style>
    ${THEME_CSS}
    ${SVG_CLASSES_CSS}
    ${FORM_STYLES_CSS}
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script type="module">
    import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "${EXT_APPS_SDK_URL}";

    const app = new App({ name: "open-generative-ui", version: "0.1.0" });
    const content = document.getElementById("content");

    window.sendPrompt = (text) =>
      app.sendMessage({ role: "user", content: [{ type: "text", text: String(text) }] });
    window.openLink = (url) => app.openLink({ url: String(url) });
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href^='http']");
      if (a) { e.preventDefault(); window.openLink(a.href); }
    });

    // innerHTML never runs scripts, so each one is recreated in document order.
    // External classic scripts are awaited so later inline code can use their globals.
    async function render(html) {
      content.innerHTML = html;
      for (const old of content.querySelectorAll("script")) {
        const script = document.createElement("script");
        for (const { name, value } of old.attributes) script.setAttribute(name, value);
        script.textContent = old.textContent;
        const loaded = script.src && script.type !== "module"
          ? new Promise((done) => { script.onload = script.onerror = done; })
          : null;
        old.replaceWith(script);
        if (loaded) await loaded;
      }
    }

    function applyHostContext(ctx) {
      if (ctx?.theme) applyDocumentTheme(ctx.theme);
      if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
      if (ctx?.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
    }

    app.ontoolinput = ({ arguments: args }) => {
      if (typeof args?.html === "string") render(args.html);
    };
    app.onhostcontextchanged = applyHostContext;
    await app.connect();
    applyHostContext(app.getHostContext());
  </script>
</body>
</html>`;
