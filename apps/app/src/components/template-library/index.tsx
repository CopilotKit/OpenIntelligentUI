"use client";

import { useEffect } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { TemplateCard } from "./template-card";
import { SEED_TEMPLATES, SEED_IDS } from "./seed-templates";

interface TemplateLibraryProps {
  open: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  html: string;
  data_description: string;
  component_type?: string;
  component_data?: Record<string, unknown>;
  version: number;
}

export function TemplateLibrary({ open, onClose }: TemplateLibraryProps) {
  const { agent } = useAgent();
  const agentTemplates: Template[] = agent.state?.templates || [];

  // Seed templates into agent state on first render so the backend can find them
  // via apply_template even when the user asks by name in chat (no pending_template).
  useEffect(() => {
    const missing = SEED_TEMPLATES.filter(
      (s) => !agentTemplates.some((t) => t.id === s.id)
    );
    if (missing.length > 0 && agent.state) {
      agent.setState({
        ...agent.state,
        templates: [...agentTemplates, ...missing],
      });
    }
    // Only run when agent state first becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!agent.state]);

  // Merge seed templates with user-saved ones for display
  const templates: Template[] = [
    ...SEED_TEMPLATES.filter((s) => !agentTemplates.some((t) => t.id === s.id)),
    ...agentTemplates,
  ];

  const handleApplyClick = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    // Ensure template is in agent state so the backend can retrieve it via apply_template
    const stateTemplates = agentTemplates.some((t) => t.id === id)
      ? agentTemplates
      : [...agentTemplates, template];

    agent.setState({
      ...agent.state,
      templates: stateTemplates,
      pending_template: { id: template.id, name: template.name },
    });
    onClose();

    // Focus the chat textarea so user can start typing immediately
    setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="copilot-chat-textarea"]'
      );
      textarea?.focus();
    }, 100);
  };

  const handleDelete = (id: string) => {
    agent.setState({
      ...agent.state,
      templates: agentTemplates.filter((t) => t.id !== id),
    });
  };

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

      {/* Drawer panel */}
      <div
        inert={!open}
        aria-hidden={!open}
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: 380,
          maxWidth: "90vw",
          transform: open ? "translateX(0)" : "translateX(100%)",
          background: "var(--surface-primary, #fff)",
          borderLeft: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
          boxShadow: open ? "-8px 0 30px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            borderBottom: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
          }}
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary, #666)" }}>
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary, #1a1a1a)" }}
            >
              Templates
            </h2>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-background-secondary, #f5f5f5)",
                color: "var(--text-secondary, #666)",
              }}
            >
              {templates.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-150"
            style={{ color: "var(--text-secondary, #666)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-tertiary, #999)", opacity: 0.5 }}>
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary, #666)" }}
              >
                No templates yet
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-tertiary, #999)" }}
              >
                Hover over a widget and click &quot;Save as Template&quot; to save it for reuse.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  description={t.description}
                  html={t.html}
                  componentType={t.component_type}
                  componentData={t.component_data}
                  dataDescription={t.data_description}
                  version={t.version}
                  onApply={handleApplyClick}
                  onDelete={SEED_IDS.has(t.id) ? undefined : handleDelete}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
