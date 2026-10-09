export interface TripFrame {
  progress: number;
  fromIndex: number;
  toIndex: number;
  fraction: number;
  activeStop: number;
  pinIndex: number;
  pinProgress: number;
}
export interface TripAnimationOptions {
  stopCount: number;
  durationMs?: number;
  /** Inner marker nodes, never Leaflet positioning wrappers. */
  pinElements?: HTMLElement[];
  onFrame: (frame: TripFrame) => void;
  onState?: (state: "playing" | "paused" | "complete") => void;
}

/** Self-contained: serialized into the sandbox, without host objects or network access. */
export function createTripAnimator(options: TripAnimationOptions) {
  const { stopCount, onFrame, onState } = options;
  const duration = options.durationMs ?? 6000;
  if (!Number.isInteger(stopCount) || stopCount < 2 || stopCount > 30)
    throw new Error("A trip needs 2–30 stops.");
  if (!Number.isFinite(duration) || duration < 1000 || duration > 120000)
    throw new Error("Trip duration must be between 1 and 120 seconds.");
  options.pinElements?.forEach((pin, index) => {
    if (!pin.textContent?.trim()) pin.textContent = String(index + 1);
  });
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
    const pinStep = progress * stopCount;
    const pinIndex = Math.min(stopCount - 1, Math.floor(pinStep));
    const pinProgress = progress === 1 ? 1 : Math.min(1, (pinStep - pinIndex) / .55);
    options.pinElements?.forEach((pin, index) => {
      const landing = index < pinIndex ? 1 : index === pinIndex ? pinProgress : 0;
      // A short drop with a restrained spring settle; preserve Leaflet's outer transform.
      const t = landing - 1;
      const ease = 1 + 2.2 * t * t * t + 1.2 * t * t;
      pin.style.opacity = landing > 0 ? "1" : "0";
      pin.style.transform = `translateY(${-18 * (1 - ease)}px) scale(${.72 + .28 * ease})`;
    });
    onFrame({ progress, fromIndex, toIndex: fromIndex + 1, fraction,
      activeStop: pinIndex, pinIndex, pinProgress });
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
    elapsed = stop === stopCount - 1 ? duration : duration * (stop + .6) / stopCount;
    emit();
    onState?.(elapsed >= duration ? "complete" : "paused");
  };
  const replay = () => {
    if (disposed) return;
    pause();
    elapsed = 0;
    emit();
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
