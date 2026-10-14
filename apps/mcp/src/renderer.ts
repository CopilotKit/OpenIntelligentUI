// OpenIntelligentUI document assembly for the MCP server.
// Design-system CSS is single-sourced from @repo/design-system.

import { THEME_CSS, SVG_CLASSES_CSS, FORM_STYLES_CSS } from "@repo/design-system";

const BRIDGE_JS = `
window.sendPrompt = function(text) {
  window.parent.postMessage({ type: 'send-prompt', text: text }, '*');
};
window.openLink = function(url) {
  window.parent.postMessage({ type: 'open-link', url: url }, '*');
};
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href]');
  if (!a) return;
  // SVG <a> elements expose href as an SVGAnimatedString, not a string.
  var url = typeof a.href === 'string'
    ? a.href
    : new URL(a.href.baseVal, document.baseURI).href;
  if (url.startsWith('http')) {
    e.preventDefault();
    window.parent.postMessage({ type: 'open-link', url: url }, '*');
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
    script-src 'unsafe-inline' 'unsafe-eval'
      https://cdnjs.cloudflare.com
      https://esm.sh
      https://cdn.jsdelivr.net
      https://unpkg.com;
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
