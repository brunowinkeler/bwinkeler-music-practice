import type { MetronomeMeter } from "../data/types";
import { BeatScheduler, type ScheduledBeat } from "./scheduler";

/**
 * Web Audio adapter around `BeatScheduler`. A 25 ms timer only *fills* the
 * look-ahead window; the sound itself is placed on the audio clock, so main
 * thread jitter cannot delay a click.
 */

export type MetronomeStatus = "idle" | "running" | "unavailable";

export interface MetronomeListener {
    onBeat?: (beat: ScheduledBeat, delayMs: number) => void;
    onStatusChange?: (status: MetronomeStatus) => void;
}

export interface MetronomeOptions {
    bpm: number;
    meter: MetronomeMeter;
    volume: number;
    muted: boolean;
}

const lookaheadIntervalMs = 25;

type AudioContextConstructor = new () => AudioContext;

function resolveAudioContext(): AudioContextConstructor | null {
    const candidate =
        typeof window === "undefined"
            ? undefined
            : (window.AudioContext ??
              (
                  window as unknown as {
                      webkitAudioContext?: AudioContextConstructor;
                  }
              ).webkitAudioContext);
    return candidate ?? null;
}

export class Metronome {
    private context: AudioContext | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private scheduler: BeatScheduler;
    private options: MetronomeOptions;
    private listener: MetronomeListener;
    private status: MetronomeStatus = "idle";

    constructor(options: MetronomeOptions, listener: MetronomeListener = {}) {
        this.options = options;
        this.listener = listener;
        this.scheduler = new BeatScheduler(options.bpm, options.meter);
    }

    getStatus(): MetronomeStatus {
        return this.status;
    }

    private setStatus(status: MetronomeStatus): void {
        if (this.status !== status) {
            this.status = status;
            this.listener.onStatusChange?.(status);
        }
    }

    /** Must be called from a user gesture: browsers block autoplay otherwise. */
    async start(): Promise<void> {
        if (this.status === "running") {
            return;
        }
        const Constructor = resolveAudioContext();
        if (!Constructor) {
            this.setStatus("unavailable");
            return;
        }
        try {
            this.context ??= new Constructor();
            if (this.context.state === "suspended") {
                await this.context.resume();
            }
        } catch {
            this.setStatus("unavailable");
            return;
        }
        this.scheduler.start(this.context.currentTime);
        this.timer = setInterval(() => {
            this.pump();
        }, lookaheadIntervalMs);
        this.setStatus("running");
        this.pump();
    }

    stop(): void {
        this.scheduler.stop();
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.status !== "unavailable") {
            this.setStatus("idle");
        }
    }

    setBpm(bpm: number): void {
        this.options = { ...this.options, bpm };
        this.scheduler.setBpm(bpm);
    }

    setMeter(meter: MetronomeMeter): void {
        this.options = { ...this.options, meter };
        this.scheduler.setMeter(meter);
    }

    setVolume(volume: number): void {
        this.options = { ...this.options, volume };
    }

    setMuted(muted: boolean): void {
        this.options = { ...this.options, muted };
    }

    dispose(): void {
        this.stop();
        void this.context?.close();
        this.context = null;
    }

    private pump(): void {
        const context = this.context;
        if (!context) {
            return;
        }
        for (const beat of this.scheduler.collect(context.currentTime)) {
            this.click(context, beat);
            const delayMs = Math.max(
                0,
                (beat.time - context.currentTime) * 1000,
            );
            this.listener.onBeat?.(beat, delayMs);
        }
    }

    private click(context: AudioContext, beat: ScheduledBeat): void {
        if (this.options.muted || this.options.volume <= 0) {
            return;
        }
        const frequency =
            beat.accent === "downbeat"
                ? 1600
                : beat.accent === "secondary"
                  ? 1200
                  : 900;
        const peak =
            this.options.volume *
            (beat.accent === "downbeat"
                ? 0.9
                : beat.accent === "secondary"
                  ? 0.7
                  : 0.55);
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, beat.time);
        gain.gain.setValueAtTime(0.0001, beat.time);
        gain.gain.exponentialRampToValueAtTime(peak, beat.time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, beat.time + 0.045);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(beat.time);
        oscillator.stop(beat.time + 0.06);
    }
}
