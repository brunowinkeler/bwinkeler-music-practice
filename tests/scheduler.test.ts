import { describe, expect, it } from "vitest";
import {
    BeatScheduler,
    accentFor,
    beatIntervalSeconds,
    clampBpm,
    meterDefinitions,
    registerTap,
    tapTempoBpm,
} from "../src/audio/scheduler";

describe("beat scheduler", () => {
    it("clamps the tempo to the supported range", () => {
        expect(clampBpm(10)).toBe(30);
        expect(clampBpm(400)).toBe(300);
        expect(clampBpm(Number.NaN)).toBe(30);
        expect(clampBpm(120.4)).toBe(120);
    });

    it("spaces beats by the tempo interval", () => {
        const scheduler = new BeatScheduler(120, "4/4", 0.1);
        scheduler.start(0, 0);
        const first = scheduler.collect(0);
        expect(first).toHaveLength(1);
        expect(first[0]?.time).toBe(0);

        const window = scheduler.collect(2);
        expect(window.map((beat) => beat.time)).toEqual([0.5, 1, 1.5, 2]);
        expect(beatIntervalSeconds(120)).toBe(0.5);
    });

    it("accents the downbeat and the secondary beat of the meter", () => {
        expect(accentFor(0, meterDefinitions["4/4"])).toBe("downbeat");
        expect(accentFor(1, meterDefinitions["4/4"])).toBe("weak");
        expect(accentFor(2, meterDefinitions["4/4"])).toBe("secondary");
        expect(accentFor(3, meterDefinitions["6/8"])).toBe("secondary");
        expect(meterDefinitions["3/4"].secondaryAccent).toBeNull();
    });

    it("cycles the beat index inside the bar", () => {
        const scheduler = new BeatScheduler(60, "3/4", 5);
        scheduler.start(0, 0);
        const beats = scheduler.collect(0);
        expect(beats.map((beat) => beat.beatIndex)).toEqual([0, 1, 2, 0, 1, 2]);
        expect(beats.every((beat) => beat.beatsPerBar === 3)).toBe(true);
    });

    it("emits nothing once stopped", () => {
        const scheduler = new BeatScheduler(120, "4/4");
        scheduler.start(0);
        scheduler.stop();
        expect(scheduler.collect(10)).toEqual([]);
        expect(scheduler.isRunning).toBe(false);
    });

    it("restarts the tap sample after a long gap", () => {
        const taps = registerTap(registerTap([], 1000), 1500);
        expect(tapTempoBpm(taps)).toBe(120);

        const afterGap = registerTap(taps, 20_000);
        expect(afterGap).toEqual([20_000]);
        expect(tapTempoBpm(afterGap)).toBeNull();
    });

    it("averages the tap intervals and clamps the result", () => {
        let taps: number[] = [];
        for (const time of [0, 400, 800, 1200]) {
            taps = registerTap(taps, time);
        }
        expect(tapTempoBpm(taps)).toBe(150);

        let fast: number[] = [];
        for (const time of [0, 100, 200]) {
            fast = registerTap(fast, time);
        }
        expect(tapTempoBpm(fast)).toBe(300);
    });
});
