export interface TripFrame {
  progress: number;
  fromIndex: number;
  toIndex: number;
  fraction: number;
  activeStop: number;
}
export interface TripAnimationOptions {
  stopCount: number;
  durationMs?: number;
  onFrame: (frame: TripFrame) => void;
  onState?: (state: "playing" | "paused" | "complete") => void;
}

/** Self-contained: serialized into the sandbox, without host objects or network access. */
export function createTripAnimator(options: TripAnimationOptions) {
  const { stopCount, onFrame, onState } = options;
  const duration = options.durationMs ?? 28000;
  if (!Number.isInteger(stopCount) || stopCount < 2 || stopCount > 30)
    throw new Error("A trip needs 2–30 stops.");
  if (!Number.isFinite(duration) || duration < 1000 || duration > 120000)
    throw new Error("Trip duration must be between 1 and 120 seconds.");
  let elapsed = 0;
  let lastTime: number | null = null;
  let frameId: number | null = null;
  let playing = false;
  let disposed = false;
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const emit = () => {
    const progress = Math.min(1, elapsed / duration);
    const step = progress * (stopCount - 1);
    const fromIndex = Math.min(stopCount - 2, Math.floor(step));
    // Travel for 80% of each leg, then hold at the destination for 20%.
    const travel = Math.min(1, (step - fromIndex) / .8);
    const fraction = travel * travel * (3 - 2 * travel);
    onFrame({ progress, fromIndex, toIndex: fromIndex + 1, fraction,
      activeStop: fraction === 1 ? fromIndex + 1 : fromIndex });
  };
  const pause = () => {
    if (disposed) return;
    playing = false;
    lastTime = null;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    onState?.(elapsed >= duration ? "complete" : "paused");
  };
  const tick = (time: number) => {
    if (!playing || disposed) return;
    if (lastTime !== null) elapsed = Math.min(duration, elapsed + Math.max(0, time - lastTime));
    lastTime = time;
    emit();
    if (elapsed >= duration) pause();
    else frameId = requestAnimationFrame(tick);
  };
  const play = () => {
    if (disposed || playing) return;
    if (reduceMotion()) {
      elapsed = duration;
      emit();
      onState?.("complete");
      return;
    }
    if (elapsed >= duration) return;
    playing = true;
    lastTime = null;
    onState?.("playing");
    frameId = requestAnimationFrame(tick);
  };
  const seek = (stop: number) => {
    if (disposed) return;
    if (!Number.isInteger(stop) || stop < 0 || stop >= stopCount)
      throw new Error("Stop index is outside this trip.");
    pause();
    elapsed = duration * stop / (stopCount - 1);
    emit();
    onState?.(elapsed >= duration ? "complete" : "paused");
  };
  const replay = () => {
    if (disposed) return;
    seek(0);
    play();
  };
  const onVisibility = () => { if (document.hidden) pause(); };
  const dispose = () => {
    if (disposed) return;
    pause();
    disposed = true;
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", dispose);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", dispose);
  if (reduceMotion()) elapsed = duration;
  emit();
  return { play, pause, replay, seek, dispose };
}

export const TRIP_ANIMATOR_SCRIPT = `<script>window.createTripAnimator = ${createTripAnimator.toString()};</script>`;
