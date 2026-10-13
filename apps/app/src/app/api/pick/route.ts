import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "./store";

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** GET — poll session status (desktop polls this) */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return reply({ error: "missing sessionId" }, 400);

  const session = getSession(sessionId);
  if (!session) return reply({ status: "waiting" });

  // Consume the prompt on first read so duplicate polls don't re-trigger
  if (session.status === "picked" && session.prompt) {
    const prompt = session.prompt;
    setSession(sessionId, { status: "picked" });
    return reply({ status: "picked", prompt });
  }

  return reply(session);
}

/** PUT — mark session as scanned (mobile calls this on page load) */
export async function PUT(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return reply({ error: "missing sessionId" }, 400);

  const existing = getSession(sessionId);
  if (!existing || existing.status === "waiting") {
    setSession(sessionId, { status: "scanned" });
  }

  return reply({ ok: true });
}

/** POST — submit picked prompt (mobile calls this when user picks an option) */
export async function POST(req: NextRequest) {
  const { sessionId, prompt } = await req.json();
  if (!sessionId || !prompt) {
    return reply({ error: "missing sessionId or prompt" }, 400);
  }

  setSession(sessionId, { status: "picked", prompt });
  return reply({ ok: true });
}
