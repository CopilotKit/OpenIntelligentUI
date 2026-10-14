import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "./store";

/** GET — poll session status (desktop polls this) */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ status: "waiting" });

  // Consume the prompt on first read so duplicate polls don't re-trigger
  if (session.status === "picked" && session.prompt) {
    const prompt = session.prompt;
    setSession(sessionId, { status: "picked" });
    return NextResponse.json({ status: "picked", prompt });
  }

  return NextResponse.json(session);
}

async function readPickInput(req: NextRequest, needsPrompt = false) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
    const { sessionId, prompt } = body as Record<string, unknown>;
    if (typeof sessionId !== "string" || !sessionId.trim() || sessionId.length > 128) return undefined;
    if (needsPrompt && (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20_000)) return undefined;
    return { sessionId, prompt: typeof prompt === "string" ? prompt : undefined };
  } catch {
    return undefined;
  }
}

/** PUT — mark session as scanned (mobile calls this on page load) */
export async function PUT(req: NextRequest) {
  const input = await readPickInput(req);
  if (!input) return NextResponse.json({ error: "missing sessionId" }, { status: 400 });

  const { sessionId } = input;
  const existing = getSession(sessionId);
  if (!existing || existing.status === "waiting") {
    setSession(sessionId, { status: "scanned" });
  }

  return NextResponse.json({ ok: true });
}

/** POST — submit picked prompt (mobile calls this when user picks an option) */
export async function POST(req: NextRequest) {
  const input = await readPickInput(req, true);
  if (!input) {
    return NextResponse.json({ error: "missing sessionId or prompt" }, { status: 400 });
  }

  setSession(input.sessionId, { status: "picked", prompt: input.prompt });
  return NextResponse.json({ ok: true });
}
