"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Pool of visualization prompts — 3 are randomly selected per visit */
/* ------------------------------------------------------------------ */
const ALL_PROMPTS = [
  {
    emoji: "🌌",
    title: "Solar System",
    prompt: "Create an interactive 3D solar system with orbiting planets, realistic textures, and orbital paths. Include labels for each planet.",
  },
  {
    emoji: "🧬",
    title: "DNA Helix",
    prompt: "Visualize a rotating 3D DNA double helix with base pairs, phosphate backbone, and smooth animation. Color-code the nucleotide bases.",
  },
  {
    emoji: "📊",
    title: "Revenue Dashboard",
    prompt: "Build a revenue analytics dashboard with a bar chart showing monthly revenue, a pie chart for revenue by category, and KPI cards for total revenue, growth rate, and top category.",
  },
  {
    emoji: "🏗️",
    title: "Microservices Architecture",
    prompt: "Diagram a microservices architecture with an API gateway, auth service, user service, order service, notification service, and a message queue connecting them. Show the data flow.",
  },
  {
    emoji: "🌊",
    title: "Ocean Waves",
    prompt: "Create an interactive 3D ocean scene with realistic wave physics, dynamic lighting, and a sunset sky gradient. Add camera controls to explore the scene.",
  },
  {
    emoji: "🔮",
    title: "Neural Network",
    prompt: "Visualize a neural network with input, hidden, and output layers. Animate data flowing through the connections with glowing pulses. Show weights as line thickness.",
  },
  {
    emoji: "🗺️",
    title: "Force-Directed Graph",
    prompt: "Create a force-directed graph visualization showing a social network with 30 nodes and connections. Nodes should be draggable, color-coded by community, and sized by connection count.",
  },
  {
    emoji: "🎵",
    title: "Audio Visualizer",
    prompt: "Build a colorful audio frequency visualizer with animated bars that react to a simulated audio spectrum. Use a gradient color scheme and smooth animations.",
  },
  {
    emoji: "🏔️",
    title: "3D Terrain",
    prompt: "Generate a 3D terrain landscape with procedural heightmap, water plane, and atmospheric fog. Add orbit controls to explore the terrain from different angles.",
  },
  {
    emoji: "⚛️",
    title: "Atom Model",
    prompt: "Create an interactive 3D Bohr model of a carbon atom with orbiting electrons, nucleus with protons and neutrons, and orbital rings. Animate the electron paths.",
  },
  {
    emoji: "🌳",
    title: "Fractal Tree",
    prompt: "Visualize a recursive fractal tree that grows with animation. Add wind simulation that sways the branches. Use natural green-to-brown color gradients.",
  },
  {
    emoji: "🚀",
    title: "Rocket Launch",
    prompt: "Create a 3D animated rocket launch scene with exhaust particles, a launch pad, and a starfield background. Add camera tracking that follows the rocket.",
  },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function PickPageWrapper() {
  return (
    <Suspense fallback={<div style={styles.container}><p style={{ color: "rgba(255,255,255,0.6)" }}>Loading...</p></div>}>
      <SessionPickPage />
    </Suspense>
  );
}

function SessionPickPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  return <PickPage key={sessionId} sessionId={sessionId} />;
}

function PickPage({ sessionId }: { sessionId: string | null }) {

  const [picked, setPicked] = useState(false);
  const [error, setError] = useState("");

  const options = useMemo(() => pickRandom(ALL_PROMPTS, 3), []);

  // Notify desktop that QR was scanned
  useEffect(() => {
    if (sessionId) {
      fetch("/api/pick", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
  }, [sessionId]);

  const handlePick = async (prompt: string) => {
    if (!sessionId || picked) return;
    setPicked(true);
    try {
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, prompt }),
      });
      if (!res.ok) throw new Error("Failed to submit");
    } catch {
      setError("Something went wrong. Try again.");
      setPicked(false);
    }
  };

  if (!sessionId) {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>Invalid link — scan the QR code from the main app.</p>
      </div>
    );
  }

  if (picked) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <span style={{ fontSize: 48 }}>&#10003;</span>
          <h2 style={styles.successTitle}>Sent!</h2>
          <p style={styles.successSub}>Look up at the big screen to see it come to life.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Pick a Visualization</h1>
      <p style={styles.subheading}>Tap one and the AI agent will build it live.</p>

      <div style={styles.grid}>
        {options.map((opt) => (
          <button
            key={opt.title}
            onClick={() => handlePick(opt.prompt)}
            style={styles.card}
          >
            <span style={styles.emoji}>{opt.emoji}</span>
            <span style={styles.cardTitle}>{opt.title}</span>
          </button>
        ))}
      </div>

      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles — self-contained page, no dependency on app theme   */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    background: "linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
    color: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 4px",
    textAlign: "center" as const,
  },
  subheading: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    margin: "0 0 32px",
    textAlign: "center" as const,
  },
  grid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
    width: "100%",
    maxWidth: 340,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 20px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.15s, background 0.15s",
    WebkitTapHighlightColor: "transparent",
    textAlign: "left" as const,
    fontFamily: "inherit",
  },
  emoji: {
    fontSize: 28,
    lineHeight: 1,
  },
  cardTitle: {
    flex: 1,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    marginTop: 16,
    textAlign: "center" as const,
  },
  successCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    color: "#85e0ce",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  successSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    margin: 0,
    textAlign: "center" as const,
  },
};
