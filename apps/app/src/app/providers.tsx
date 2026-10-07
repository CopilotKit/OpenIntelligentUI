"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CopilotKit
        runtimeUrl="/api/copilotkit"
        showDevConsole={false}
        enableInspector={false}
        renderActivityMessages={renderActivityMessages}
        openGenerativeUI={openGenerativeUI}
      >
        <CopilotChatConfigurationProvider>
          <OpenGenUIPromptBridge />
          {children}
        </CopilotChatConfigurationProvider>
      </CopilotKit>
    </ThemeProvider>
  );
}
