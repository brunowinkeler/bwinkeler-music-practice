import type { MetronomeMeter } from "../data/types";
import { limits } from "../data/types";

/**
 * Beat timing is derived from the audio clock, never from `setInterval` ticks:
 * the scheduler only decides *when* upcoming beats must sound, and the audio
 * layer renders them at that exact time.
 */

export type BeatAccent = "downbeat" | "secondary" | "weak";

export interface ScheduledBeat {
    /** Audio-clock time, in seconds, at which the beat must sound. */
    time: number;
    beatIndex: number;
    beatsPerBar: number;
    accent: BeatAccent;
}

export interface MeterDefinition {
    beatsPerBar: number;
    secondaryAccent: number | null;
}

export const meterDefinitions: Record<MetronomeMeter, MeterDefinition> = {
    "2/4": { beatsPerBar: 2, secondaryAccent: null },
    "3/4": { beatsPerBar: 3, secondaryAccent: null },
    "4/4": { beatsPerBar: 4, secondaryAccent: 2 },
    "6/8": { beatsPerBar: 6, secondaryAccent: 3 },
};

export function clampBpm(bpm: number): number {
    if (!Number.isFinite(bpm)) {
        return limits.minBpm;
    }
    return Math.min(limits.maxBpm, Math.max(limits.minBpm, Math.round(bpm)));
}

export function beatIntervalSeconds(bpm: number): number {
    return 60 / clampBpm(bpm);
}

export function accentFor(
    beatIndex: number,
    meter: MeterDefinition,
): BeatAccent {
    if (beatIndex === 0) {
        return "downbeat";
    }
    return meter.secondaryAccent === beatIndex ? "secondary" : "weak";
}

export class BeatScheduler {
    private bpm: number;
    private meter: MetronomeMeter;
    private nextBeatTime = 0;
    private beatIndex = 0;
    private running = false;

    readonly scheduleAheadSeconds: number;

    constructor(
        bpm: number,
        meter: MetronomeMeter,
        scheduleAheadSeconds = 0.12,
    ) {
        this.bpm = clampBpm(bpm);
        this.meter = meter;
        this.scheduleAheadSeconds = scheduleAheadSeconds;
    }

    get isRunning(): boolean {
        return this.running;
    }

    start(currentTime: number, leadInSeconds = 0.06): void {
        this.running = true;
        this.beatIndex = 0;
        this.nextBeatTime = currentTime + leadInSeconds;
    }

    stop(): void {
        this.running = false;
    }

    setBpm(bpm: number): void {
        this.bpm = clampBpm(bpm);
    }

    setMeter(meter: MetronomeMeter): void {
        this.meter = meter;
        this.beatIndex = 0;
    }

    /** Returns every beat that must be scheduled within the look-ahead window. */
    collect(currentTime: number, maxBeats = 64): ScheduledBeat[] {
        if (!this.running) {
            return [];
        }
        const beats: ScheduledBeat[] = [];
        const horizon = currentTime + this.scheduleAheadSeconds;
        const definition = meterDefinitions[this.meter];
        while (this.nextBeatTime <= horizon && beats.length < maxBeats) {
            beats.push({
                time: this.nextBeatTime,
                beatIndex: this.beatIndex,
                beatsPerBar: definition.beatsPerBar,
                accent: accentFor(this.beatIndex, definition),
            });
            this.nextBeatTime += beatIntervalSeconds(this.bpm);
            this.beatIndex = (this.beatIndex + 1) % definition.beatsPerBar;
        }
        return beats;
    }
}

const maxTapGapMs = 2_500;
const maxTaps = 6;

export function registerTap(taps: number[], nowMs: number): number[] {
    const last = taps[taps.length - 1];
    const restart = last === undefined || nowMs - last > maxTapGapMs;
    const next = restart ? [nowMs] : [...taps, nowMs];
    return next.slice(-maxTaps);
}

export function tapTempoBpm(taps: number[]): number | null {
    if (taps.length < 2) {
        return null;
    }
    const intervals: number[] = [];
    for (let index = 1; index < taps.length; index += 1) {
        intervals.push((taps[index] as number) - (taps[index - 1] as number));
    }
    const average =
        intervals.reduce((total, value) => total + value, 0) / intervals.length;
    if (average <= 0) {
        return null;
    }
    return clampBpm(60_000 / average);
}
