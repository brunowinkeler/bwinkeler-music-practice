import { describe, expect, it } from "vitest";
import { chordTones, findQuality, findRoot } from "../src/music/chords";
import {
    inversionCount,
    invertVoicing,
    keyboardLayout,
    keyboardRange,
    pitchLabel,
    rootPositionVoicing,
} from "../src/music/piano";

function tones(rootName: string, qualityId: string) {
    const root = findRoot(rootName);
    const quality = findQuality(qualityId);
    if (!root || !quality) {
        throw new Error(`Unknown chord: ${rootName} ${qualityId}`);
    }
    return chordTones(root, quality);
}

describe("keyboard voicings", () => {
    it("stacks the root position from the octave below middle C", () => {
        expect(rootPositionVoicing(tones("C", "maj"))).toEqual([48, 52, 55]);
        expect(rootPositionVoicing(tones("B", "min7"))).toEqual([
            59, 62, 66, 69,
        ]);
    });

    it("moves the lowest note above the top note for each inversion", () => {
        const triad = rootPositionVoicing(tones("C", "maj"));
        expect(invertVoicing(triad, 0)).toEqual([48, 52, 55]);
        expect(invertVoicing(triad, 1)).toEqual([52, 55, 60]);
        expect(invertVoicing(triad, 2)).toEqual([55, 60, 64]);
    });

    it("offers one inversion per tone, up to four", () => {
        expect(inversionCount(tones("C", "maj"))).toBe(3);
        expect(inversionCount(tones("C", "maj7"))).toBe(4);
        expect(inversionCount(tones("C", "dom13"))).toBe(4);
    });

    it("draws whole octaves and never fewer than two", () => {
        expect(keyboardRange([48, 52, 55])).toEqual({ from: 48, to: 71 });
        expect(keyboardRange([59, 62, 66, 81])).toEqual({ from: 48, to: 83 });
    });

    it("places black keys on the boundary between two white keys", () => {
        const layout = keyboardLayout(48, 59);
        const white = layout.keys.filter((key) => !key.black);
        const black = layout.keys.filter((key) => key.black);
        expect(white).toHaveLength(7);
        expect(black).toHaveLength(5);
        expect(white[0]?.x).toBe(0);
        expect(white[1]?.x).toBe(layout.whiteWidth);
        expect(black[0]?.x).toBe(layout.whiteWidth - layout.blackWidth / 2);
        expect(layout.width).toBe(7 * layout.whiteWidth);
    });

    it("names an octave after the spelled letter", () => {
        expect(pitchLabel({ letter: "E", alteration: -1 }, 51)).toBe("Eb3");
        expect(pitchLabel({ letter: "C", alteration: 0 }, 60)).toBe("C4");
        expect(pitchLabel({ letter: "C", alteration: -1 }, 59)).toBe("Cb4");
    });
});
