import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import appPackage from "../../package.json";

// Counts how many people run this template, once per installation, through the
// same CopilotKit telemetry ingest that OpenDots uses. See docs/telemetry.md for
// exactly what is sent and how to turn it off.

export const TELEMETRY_INGEST_URL = "https://telemetry.copilotkit.ai/ingest";

type Env = Record<string, string | undefined>;
type Kind = "opened" | "activated";
type Diagnostic = "delivery_failed" | "storage_failed";
type Send = (identity: string, body: Record<string, unknown>) => Promise<void>;

interface State {
  installationId: string;
  sent: Partial<Record<Kind, true>>;
}

const DISTRIBUTIONS = ["self_hosted", "hosted_demo", "development"] as const;
export type Distribution = (typeof DISTRIBUTIONS)[number];

const EVENTS: Record<Kind, { name: string; properties: Record<string, string> }> = {
  opened: { name: "oss.runtime.setup_step_viewed", properties: { kind: "step_viewed", step: "ready" } },
  activated: { name: "oss.runtime.setup_activated", properties: { kind: "activated" } },
};

export function telemetryEnabled(env: Env): boolean {
  const off = (key: string) => ["true", "1"].includes(env[key] ?? "");
  return !(off("DO_NOT_TRACK") || off("COPILOTKIT_TELEMETRY_DISABLED") || env.COPILOTKIT_TELEMETRY_SAMPLE_RATE === "0");
}

export function telemetryDistribution(env: Env): Distribution {
  const value = env.OIUI_DISTRIBUTION as Distribution | undefined;
  return value && DISTRIBUTIONS.includes(value) ? value : "self_hosted";
}

const serverPlatform = () =>
  process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : process.platform === "linux" ? "linux" : "other";
const serverArch = () => (process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : "other");

const productionSend: Send = async (identity, body) => {
  const response = await fetch(TELEMETRY_INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CopilotKit-Telemetry-Id": identity },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error("Telemetry delivery failed");
};

export class LaunchTelemetry {
  private readonly env: Env;
  private readonly statePath: string;
  private readonly send: Send;
  private readonly report: (diagnostic: Diagnostic) => void;
  private readonly enabled: boolean;
  private state?: State;
  private readonly inflight = new Map<Kind, Promise<void>>();

  constructor(options: {
    env?: Env;
    statePath?: string;
    send?: Send;
    report?: (diagnostic: Diagnostic) => void;
  } = {}) {
    this.env = options.env ?? process.env;
    this.statePath =
      options.statePath ?? this.env.OIUI_TELEMETRY_STATE_PATH ?? join(process.cwd(), ".open-intelligent-ui", "telemetry.json");
    this.send = options.send ?? productionSend;
    this.report =
      options.report ??
      ((diagnostic) =>
        console.error(JSON.stringify({ error: diagnostic, context: { component: "launch_telemetry" }, timestamp: new Date().toISOString() })));
    this.enabled = telemetryEnabled(this.env);

    if (!this.enabled) {
      // Opting out also removes the stored installation id.
      try {
        rmSync(this.statePath, { force: true });
      } catch {
        this.report("storage_failed");
      }
      return;
    }
    this.state = this.load() ?? { installationId: randomUUID(), sent: {} };
  }

  /** Properties for the CopilotKit runtime's own telemetry (`properties._copilotkit`). */
  runtimeProperties(): Record<string, string> | undefined {
    if (!this.state) return undefined;
    return {
      template: "open-intelligent-ui",
      openintelligentui_distribution: telemetryDistribution(this.env),
      openintelligentui_version: appPackage.version,
      installation_id: this.state.installationId,
    };
  }

  /** Someone opened the app: its UI reached the runtime for the first time. */
  recordOpened(): Promise<void> {
    return this.record("opened");
  }

  /** The agent finished its first run with an answer. */
  recordActivated(): Promise<void> {
    return this.record("activated");
  }

  get activated(): boolean {
    return !this.state || this.state.sent.activated === true;
  }

  private record(kind: Kind): Promise<void> {
    const state = this.state;
    if (!state || state.sent[kind]) return Promise.resolve();
    const pending = this.inflight.get(kind);
    if (pending) return pending;
    const delivery = this.deliver(kind, state).finally(() => this.inflight.delete(kind));
    this.inflight.set(kind, delivery);
    return delivery;
  }

  private async deliver(kind: Kind, state: State): Promise<void> {
    const event = EVENTS[kind];
    try {
      await this.send(this.env.CPK_TELEMETRY_ID?.trim() || state.installationId, {
        event: event.name,
        event_id: randomUUID(),
        properties: event.properties,
        global_properties: this.metadata(state),
        package: { name: "open-intelligent-ui", version: appPackage.version },
        ts: Math.floor(Date.now() / 1000),
      });
    } catch {
      this.report("delivery_failed");
      return;
    }
    state.sent[kind] = true;
    this.persist(state);
  }

  private metadata(state: State) {
    return {
      accessibility_title: "Open Intelligent UI",
      openintelligentui_distribution: telemetryDistribution(this.env),
      openintelligentui_version: appPackage.version,
      runtime_env: "node",
      server_platform: serverPlatform(),
      server_arch: serverArch(),
      installation_id: state.installationId,
      sampleRate: 1,
      sampleWeight: 1,
      sampleRateAdjustmentFactor: 0,
    };
  }

  private load(): State | undefined {
    try {
      const saved = JSON.parse(readFileSync(this.statePath, "utf8"));
      if (typeof saved?.installationId === "string" && saved.installationId && typeof saved.sent === "object" && saved.sent) {
        return {
          installationId: saved.installationId,
          sent: { ...(saved.sent.opened === true && { opened: true }), ...(saved.sent.activated === true && { activated: true }) },
        };
      }
    } catch {
      // Missing or unreadable state starts a new installation.
    }
    return undefined;
  }

  private persist(state: State) {
    try {
      mkdirSync(dirname(this.statePath), { recursive: true });
      writeFileSync(this.statePath, JSON.stringify({ installationId: state.installationId, sent: state.sent }));
    } catch {
      this.report("storage_failed");
    }
  }
}

/** The single-route runtime method of a request (for example "agent/run"), read from a clone. */
export async function runtimeMethod(req: Request): Promise<string | undefined> {
  try {
    const body = await req.clone().json();
    return typeof body?.method === "string" ? body.method : undefined;
  } catch {
    return undefined;
  }
}

let shared: LaunchTelemetry | undefined;

/** Lazily created so builds and imports never touch the filesystem. */
export function getLaunchTelemetry(): LaunchTelemetry {
  shared ??= new LaunchTelemetry();
  return shared;
}

/**
 * Reads an AG-UI event stream (server-sent events) and resolves true when the run
 * finished with assistant text and no run error. No message content is retained.
 */
export async function observeRunResult(stream: ReadableStream<Uint8Array | string>): Promise<boolean> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let text = false;
  let failed = false;
  let finished = false;

  let dataLines: string[] = [];
  const inspect = () => {
    const data = dataLines.join("\n");
    dataLines = [];
    if (!data) return;
    let event: { type?: string; delta?: string };
    try { event = JSON.parse(data); } catch { return; }
    if (event.type === "TEXT_MESSAGE_CONTENT" && typeof event.delta === "string" && event.delta.trim()) text = true;
    if (event.type === "RUN_ERROR") failed = true;
    if (event.type === "RUN_FINISHED") finished = true;
  };
  const line = (value: string) => {
    if (!value) inspect();
    else if (value.startsWith("data:")) dataLines.push(value.slice(5).replace(/^ /, ""));
  };
  const consume = (final = false) => {
    let match: RegExpExecArray | null;
    while ((match = /\r\n|\r(?!$)|\n/.exec(carry))) {
      line(carry.slice(0, match.index));
      carry = carry.slice(match.index + match[0].length);
    }
    if (final) { line(carry.replace(/\r$/, "")); inspect(); carry = ""; }
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += typeof value === "string" ? value : decoder.decode(value, { stream: true });
      consume();
    }
    carry += decoder.decode();
    consume(true);
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }
  return finished && text && !failed;
}
