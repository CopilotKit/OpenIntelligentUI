"use client";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core";
import { OPEN_GEN_UI_DESIGN_SKILL } from "@repo/design-system";
import { OPEN_GEN_UI_ACTIVITY_RENDERER } from "@/components/generative-ui/open-generative-ui";
import { SANDBOX_FUNCTIONS } from "@/lib/sandbox/sandbox-functions";
import { OpenGenUIPromptBridge } from "@/lib/sandbox/prompt-bridge";
import { ThemeProvider } from "@/hooks/use-theme";

const renderActivityMessages = [OPEN_GEN_UI_ACTIVITY_RENDERER];

const openGenerativeUI = {
  sandboxFunctions: [...SANDBOX_FUNCTIONS],
  designSkill: OPEN_GEN_UI_DESIGN_SKILL,
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Open Intelligent UI</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪁</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <CopilotKit
            runtimeUrl="/api/copilotkit"
            renderActivityMessages={renderActivityMessages}
            openGenerativeUI={openGenerativeUI}
          >
            <OpenGenUIPromptBridge />
            {children}
          </CopilotKit>
        </ThemeProvider>
      </body>
    </html>
  );
}
