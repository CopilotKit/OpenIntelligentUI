import type { Metadata } from "next";
import "./globals.css";
import "./chat.css";
import "@copilotkit/react-core/v2/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      "https://opengenerativeui.copilotkit.ai",
  ),
  title: "Open Intelligent UI — Answers you can interact with",
  description:
    "Explore ideas, compare your options, and make useful tools with interactive AI responses. Open source, built with CopilotKit.",
  openGraph: {
    title: "Open Intelligent UI",
    description:
      "Answers you can interact with. Open source, built with CopilotKit.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
