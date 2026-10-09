"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
import { OPEN_GEN_UI_DESIGN_SKILL } from "@repo/design-system";
import { OPEN_GEN_UI_ACTIVITY_RENDERER } from "@/components/generative-ui/open-generative-ui";
import { SANDBOX_FUNCTIONS } from "@/lib/sandbox/sandbox-functions";
import { OpenGenUIPromptBridge } from "@/lib/sandbox/prompt-bridge";
import { tableCatalog } from "@/components/generative-ui/table-catalog";
import { ProviderKeysProvider, useProviderKeys } from "@/components/chat/provider-keys";
import { ThemeProvider } from "@/hooks/use-theme";

const a2ui = { catalog: tableCatalog };

const renderActivityMessages = [OPEN_GEN_UI_ACTIVITY_RENDERER];
const openGenerativeUI = {
  sandboxFunctions: [...SANDBOX_FUNCTIONS],
  designSkill: OPEN_GEN_UI_DESIGN_SKILL,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ProviderKeysProvider>
        <ChatProviders>{children}</ChatProviders>
      </ProviderKeysProvider>
    </ThemeProvider>
  );
}

function ChatProviders({ children }: { children: React.ReactNode }) {
  const { headers, session } = useProviderKeys();
  return (
    <CopilotKit
      key={session}
      headers={headers}
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      enableInspector={false}
      renderActivityMessages={renderActivityMessages}
      openGenerativeUI={openGenerativeUI}
      a2ui={a2ui}
    >
      <CopilotChatConfigurationProvider>
        <OpenGenUIPromptBridge />
        {children}
      </CopilotChatConfigurationProvider>
    </CopilotKit>
  );
}
