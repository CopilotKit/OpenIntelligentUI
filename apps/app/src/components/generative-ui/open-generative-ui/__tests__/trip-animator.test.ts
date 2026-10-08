import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTripAnimator } from "../trip-animator";

let tick: FrameRequestCallback;
let reduced = false;
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => { tick = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
});
afterEach(() => { reduced = false; vi.unstubAllGlobals(); });

it("draws slowly, pauses without a time jump, and finishes exactly at the last stop", () => {
  const frame = vi.fn();
  const animator = createTripAnimator({ stopCount: 4, durationMs: 24000, onFrame: frame });
  animator.play(); tick(0); tick(6000);
  expect(frame.mock.lastCall?.[0].progress).toBe(.25);
  animator.pause(); animator.play(); tick(100000); tick(106000);
  expect(frame.mock.lastCall?.[0].progress).toBe(.5);
  tick(118000);
  expect(frame.mock.lastCall?.[0]).toMatchObject({ progress: 1, activeStop: 3, fraction: 1 });
  animator.dispose();
});

it("selects a stop, pauses the tour, and can replay from the beginning", () => {
  const frame = vi.fn(); const state = vi.fn();
  const animator = createTripAnimator({ stopCount: 6, onFrame: frame, onState: state });
  animator.play(); animator.seek(3);
  expect(state).toHaveBeenLastCalledWith("paused");
  expect(frame.mock.lastCall?.[0]).toMatchObject({ activeStop: 3, progress: .6 });
  animator.replay();
  expect(frame.mock.lastCall?.[0].progress).toBe(0);
  expect(state).toHaveBeenLastCalledWith("playing");
  animator.dispose();
});

it("respects reduced motion and cleans up the animation", () => {
  reduced = true;
  const frame = vi.fn();
  const animator = createTripAnimator({ stopCount: 3, onFrame: frame });
  animator.play();
  expect(frame.mock.lastCall?.[0].progress).toBe(1);
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  animator.dispose(); animator.play();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it("rejects invalid stops and duration instead of producing invalid map coordinates", () => {
  expect(() => createTripAnimator({ stopCount: 1, onFrame: vi.fn() })).toThrow();
  expect(() => createTripAnimator({ stopCount: 4, durationMs: NaN, onFrame: vi.fn() })).toThrow();
});

it("runs independently after serialization into the sandbox", () => {
  const standalone = new Function("return (" + createTripAnimator.toString() + ")")();
  const frame = vi.fn();
  const animator = standalone({ stopCount: 3, onFrame: frame });
  animator.play(); tick(0); tick(28000);
  expect(frame.mock.lastCall?.[0].activeStop).toBe(2);
  animator.dispose();
});
