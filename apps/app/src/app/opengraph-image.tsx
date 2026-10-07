import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "Open Generative UI by CopilotKit — Answers you can interact with";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [font, logo] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/plus-jakarta-sans-medium.ttf")),
    readFile(join(process.cwd(), "public/copilotkit-logo.svg")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 80px",
          background: "#FAFAFC",
          color: "#010507",
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ display: "flex", fontSize: 25 }}>
          Open Generative UI{" "}
          <span
            style={{
              marginLeft: 30,
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#57575B",
            }}
          >
            by{" "}
            <img
              src={`data:image/svg+xml;base64,${logo.toString("base64")}`}
              width="160"
              height="36"
              alt="CopilotKit"
            />
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 78,
            letterSpacing: -4,
            lineHeight: 1.12,
          }}
        >
          <span>Answers you can</span>
          <span style={{ color: "#189370" }}>interact with.</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 20 }}>
          {["Understand", "Compare", "Make a tool"].map((label) => (
            <span
              key={label}
              style={{
                border: "1px solid #DBDBE5",
                borderRadius: 12,
                padding: "14px 24px",
                background: "#fff",
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "#57575B" }}>
          Open source. Built with CopilotKit.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Jakarta", data: font, weight: 500, style: "normal" }],
    },
  );
}
