"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSandboxFunctions } from "@copilotkit/react-core/v2";
import { ExportOverlay } from "../export-overlay";
import { assembleStandaloneHtmlFromActivity } from "../export-utils";
import { IDIOMORPH_JS } from "../idiomorph-inline";
import type { OpenGenUIContent } from "./schema";
import {
  buildFinalFrameContent,
  buildPreviewBodyMorph,
  buildPreviewHeadContent,
  MEASUREMENT_JS,
  PREVIEW_FRAME_CONTENT,
  RESIZE_MESSAGE_TYPE,
} from "./frame-content";
import { extractCompleteStyles, processPartialHtml } from "./process-partial-html";
import { loadWebsandbox, type SandboxInstance } from "./websandbox-loader";

export const THROTTLE_MS = 1000;
const MIN_HEIGHT = 50;
const MAX_HEIGHT = 4000;

/**
 * Clamp a sandbox-reported height to the allowed range. Returns null for
 * anything that is not a finite number (NaN/Infinity pass a bare typeof
 * check and would otherwise poison the container height).
 */
export function clampReportedHeight(height: unknown): number | null {
  if (typeof height !== "number" || !Number.isFinite(height)) return null;
  return Math.max(MIN_HEIGHT, Math.min(Math.ceil(height), MAX_HEIGHT));
}

export const LOADING_PHRASES = [
  "Sketching pixels",
  "Wiring up nodes",
  "Painting gradients",
  "Compiling visuals",
  "Arranging atoms",
  "Rendering magic",
  "Polishing edges",
];

function useLoadingPhrase(active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [active]);
  return LOADING_PHRASES[index];
}

interface OpenGenUIActivityRendererProps {
  activityType: string;
  content: OpenGenUIContent;
  message: unknown;
  agent: unknown;
}

/**
 * Returns true when the inner component should re-render immediately
 * (no throttle delay).
 */
function shouldFlushImmediately(
  prev: OpenGenUIContent | null,
  next: OpenGenUIContent
): boolean {
  if (next.cssComplete && (!prev || !prev.cssComplete)) return true;
  if (next.htmlComplete) return true;
  if (next.generating === false) return true;
  if (next.jsFunctions && (!prev || !prev.jsFunctions)) return true;
  if ((next.jsExpressions?.length ?? 0) > (prev?.jsExpressions?.length ?? 0))
    return true;
  if (next.html?.length && (!prev || !prev.html?.length)) return true;
  return false;
}

/**
 * Outer wrapper — absorbs every parent re-render but only forwards
 * throttled content snapshots to the memoized inner component.
 */
export const OpenGenUIActivityRenderer: React.FC<OpenGenUIActivityRendererProps> =
  function OpenGenUIActivityRenderer({ content }) {
    const [throttledContent, setThrottledContent] =
      useState<OpenGenUIContent>(content);
    const [prevContent, setPrevContent] = useState(content);
    const latestContentRef = useRef(content);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Synchronous state adjustment during render (React-approved pattern):
    // immediate-flush updates reach the inner component in the same pass.
    if (content !== prevContent) {
      setPrevContent(content);
      if (shouldFlushImmediately(throttledContent, content)) {
        setThrottledContent(content);
      }
    }

    useEffect(() => {
      latestContentRef.current = content;
    });

    const flush = useCallback(() => {
      timerRef.current = null;
      setThrottledContent(latestContentRef.current);
    }, []);

    useEffect(() => {
      if (throttledContent === content) {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      if (timerRef.current === null) {
        timerRef.current = setTimeout(flush, THROTTLE_MS);
      }
    }, [content, throttledContent, flush]);

    useEffect(() => {
      return () => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    return <OpenGenUIActivityRendererInner content={throttledContent} />;
  };

interface InnerProps {
  content: OpenGenUIContent;
}

function styleIframe(iframe: HTMLIFrameElement) {
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.backgroundColor = "transparent";
}

const OpenGenUIActivityRendererInner = React.memo(
  function OpenGenUIActivityRendererInner({ content }: InnerProps) {
    const initialHeight = content.initialHeight ?? 200;
    const [autoHeight, setAutoHeight] = useState<number | null>(null);
    const sandboxFunctions = useSandboxFunctions();

    const localApi = useMemo(() => {
      const api: Record<string, (args: unknown) => unknown> = {};
      for (const fn of sandboxFunctions) {
        api[fn.name] = fn.handler;
      }
      return api;
    }, [sandboxFunctions]);

    const fullHtml =
      content.htmlComplete && content.html?.length
        ? content.html.join("")
        : undefined;

    const css = content.cssComplete ? content.css : undefined;

    // CSS-first gating: no visible preview until cssComplete.
    const cssReady = !!content.cssComplete;
    const partialHtml =
      !content.htmlComplete && content.html?.length
        ? content.html.join("")
        : undefined;
    const previewBody = partialHtml ? processPartialHtml(partialHtml) : undefined;
    const previewStyles = partialHtml ? extractCompleteStyles(partialHtml) : "";
    const hasPreview = cssReady && !!previewBody?.trim();
    const hasVisibleSandbox = !!fullHtml || hasPreview;

    const containerRef = useRef<HTMLDivElement>(null);
    const sandboxRef = useRef<SandboxInstance | null>(null);
    const previewSandboxRef = useRef<SandboxInstance | null>(null);
    const previewReadyRef = useRef(false);
    const sandboxReadyRef = useRef(false);
    const executedIndexRef = useRef(0);
    const pendingQueueRef = useRef<string[]>([]);
    const jsFunctionsInjectedRef = useRef(false);

    // Effect 0 — Preview sandbox creation
    useEffect(() => {
      const container = containerRef.current;
      if (!container || fullHtml || !hasPreview || previewSandboxRef.current)
        return;

      let cancelled = false;

      loadWebsandbox()
        .then((Websandbox) => {
          if (cancelled) return;

          const sandbox = Websandbox.create(
            {},
            {
              frameContainer: container,
              frameContent: PREVIEW_FRAME_CONTENT,
              allowAdditionalAttributes: "",
            }
          );
          previewSandboxRef.current = sandbox;
          styleIframe(sandbox.iframe);

          sandbox.promise.then(() => {
            if (cancelled) return;
            previewReadyRef.current = true;

            sandbox.run(IDIOMORPH_JS);
            sandbox.run(
              `document.head.innerHTML = ${JSON.stringify(
                buildPreviewHeadContent(css, previewStyles)
              )}`
            );
            if (previewBody) {
              sandbox.run(buildPreviewBodyMorph(previewBody));
            }
          });
        })
        .catch((err: unknown) => {
          console.error("[OpenGenUI] Failed to load sandbox module:", err);
        });

      return () => {
        cancelled = true;
      };
    }, [hasPreview, fullHtml]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect 0b — Preview content updates (head styles + morphed body)
    useEffect(() => {
      const sandbox = previewSandboxRef.current;
      if (!sandbox || !previewReadyRef.current) return;
      sandbox.run(
        `document.head.innerHTML = ${JSON.stringify(
          buildPreviewHeadContent(css, previewStyles)
        )}`
      );
      if (!previewBody) return;
      sandbox.run(buildPreviewBodyMorph(previewBody));
    }, [previewBody, previewStyles, css]);

    // Effect 1 — Final sandbox lifecycle (depends on fullHtml)
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !fullHtml) return;

      if (previewSandboxRef.current) {
        previewSandboxRef.current.destroy();
        previewSandboxRef.current = null;
        previewReadyRef.current = false;
      }

      let cancelled = false;

      executedIndexRef.current = 0;
      jsFunctionsInjectedRef.current = false;
      sandboxReadyRef.current = false;
      pendingQueueRef.current = [];

      // Continuous autosize: track every resize report from this sandbox.
      const onMessage = (e: MessageEvent) => {
        const sandbox = sandboxRef.current;
        if (!sandbox) return;
        if (
          e.source === sandbox.iframe.contentWindow &&
          e.data?.type === RESIZE_MESSAGE_TYPE
        ) {
          const clamped = clampReportedHeight(e.data.height);
          if (clamped !== null) setAutoHeight(clamped);
        }
      };
      window.addEventListener("message", onMessage);

      loadWebsandbox()
        .then((Websandbox) => {
          if (cancelled) return;

          const sandbox = Websandbox.create(localApi, {
            frameContainer: container,
            frameContent: buildFinalFrameContent(fullHtml, css),
            allowAdditionalAttributes: "",
          });
          sandboxRef.current = sandbox;
          styleIframe(sandbox.iframe);

          sandbox.promise.then(() => {
            if (cancelled) return;
            sandboxReadyRef.current = true;

            sandbox.run(MEASUREMENT_JS);

            const queue = pendingQueueRef.current;
            pendingQueueRef.current = [];
            (async () => {
              for (const code of queue) {
                await sandbox.run(code);
              }
            })();
          });
        })
        .catch((err: unknown) => {
          console.error("[OpenGenUI] Failed to load sandbox module:", err);
        });

      return () => {
        cancelled = true;
        window.removeEventListener("message", onMessage);
        if (previewSandboxRef.current) {
          previewSandboxRef.current.destroy();
          previewSandboxRef.current = null;
          previewReadyRef.current = false;
        }
        if (sandboxRef.current) {
          sandboxRef.current.destroy();
          sandboxRef.current = null;
        }
        sandboxReadyRef.current = false;
        setAutoHeight(null);
      };
    }, [fullHtml, css, localApi]);

    // Effect 2 — jsFunctions injection (once per final sandbox)
    useEffect(() => {
      if (!content.jsFunctions || jsFunctionsInjectedRef.current) return;
      jsFunctionsInjectedRef.current = true;

      const sandbox = sandboxRef.current;
      if (sandboxReadyRef.current && sandbox) {
        sandbox.run(content.jsFunctions);
      } else {
        pendingQueueRef.current.push(content.jsFunctions);
      }
    }, [content.jsFunctions, fullHtml, css, localApi]);

    // Effect 3 — jsExpressions execution (arrival order, sequential await)
    useEffect(() => {
      const expressions = content.jsExpressions;
      if (!expressions || expressions.length === 0) return;

      const startIndex = executedIndexRef.current;
      if (startIndex >= expressions.length) return;

      const newExprs = expressions.slice(startIndex);
      executedIndexRef.current = expressions.length;

      const sandbox = sandboxRef.current;
      if (sandboxReadyRef.current && sandbox) {
        (async () => {
          for (const expr of newExprs) {
            await sandbox.run(expr);
          }
        })();
      } else {
        pendingQueueRef.current.push(...newExprs);
      }
    }, [content.jsExpressions?.length, fullHtml, css, localApi]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect 4 — destroy any remaining sandbox on unmount
    useEffect(() => {
      return () => {
        if (previewSandboxRef.current) {
          previewSandboxRef.current.destroy();
          previewSandboxRef.current = null;
        }
        if (sandboxRef.current) {
          sandboxRef.current.destroy();
          sandboxRef.current = null;
        }
      };
    }, []);

    const height = autoHeight ?? initialHeight;
    const isGenerating = content.generating !== false;
    const showLoading = isGenerating && !hasVisibleSandbox;
    const loadingPhrase = useLoadingPhrase(showLoading);

    const isComplete = !isGenerating && !!content.htmlComplete;
    const exportHtml = useMemo(
      () =>
        isComplete
          ? assembleStandaloneHtmlFromActivity({
              css: content.css,
              html: content.html,
              jsFunctions: content.jsFunctions,
              jsExpressions: content.jsExpressions,
            })
          : undefined,
      [isComplete, content]
    );

    const frame = (
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: `${height}px`,
          borderRadius: "12px",
          backgroundColor: hasVisibleSandbox
            ? "transparent"
            : "var(--color-background-secondary, #f7f6f3)",
          border: hasVisibleSandbox
            ? "none"
            : "1px solid var(--color-border-tertiary, rgba(0, 0, 0, 0.15))",
          overflow: "hidden",
          transition: "height 200ms ease-out",
        }}
      >
        {showLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid var(--color-border-tertiary, rgba(0, 0, 0, 0.1))",
                borderTopColor: "var(--color-text-secondary, #73726c)",
                animation: "ogui-spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--color-text-secondary, #666)",
              }}
            >
              {loadingPhrase}...
            </span>
            <style>{`@keyframes ogui-spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
      </div>
    );

    // Always wrap in ExportOverlay so the rendered tree shape never changes:
    // switching the root from the bare frame div to a wrapper when isComplete
    // flips would remount the container and silently destroy the live
    // websandbox iframe created during the htmlComplete && generating window.
    return (
      <ExportOverlay
        title="generated-widget"
        html={exportHtml}
        componentType="openGenUI"
        ready={isComplete}
      >
        {frame}
      </ExportOverlay>
    );
  },
  (prev, next) => prev.content === next.content
);
