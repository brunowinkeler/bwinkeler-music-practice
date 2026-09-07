import { describe, expect, it } from "vitest";
import {
    chordQualities,
    chordRoots,
    chordSymbol,
    chordTones,
    findQuality,
    findRoot,
    intervalLabel,
    omittableDegrees,
    parseChordSymbol,
} from "../src/music/chords";
import { noteName, parseNote, pitchClass } from "../src/music/notes";

function quality(id: string) {
    const found = findQuality(id);
    if (!found) {
        throw new Error(`Unknown chord quality: ${id}`);
    }
    return found;
}

function root(name: string) {
    const found = findRoot(name);
    if (!found) {
        throw new Error(`Unknown root: ${name}`);
    }
    return found;
}

function names(rootName: string, qualityId: string): string[] {
    return chordTones(root(rootName), quality(qualityId)).map(
        (tone) => tone.name,
    );
}

describe("note spelling", () => {
    it("reads a typed note", () => {
        expect(parseNote("c")).toEqual({ letter: "C", alteration: 0 });
        expect(parseNote("Bb")).toEqual({ letter: "B", alteration: -1 });
        expect(parseNote("F#")).toEqual({ letter: "F", alteration: 1 });
        expect(parseNote("H")).toBeNull();
    });

    it("keeps enharmonic spellings apart", () => {
        expect(pitchClass({ letter: "C", alteration: 1 })).toBe(1);
        expect(pitchClass({ letter: "D", alteration: -1 })).toBe(1);
        expect(noteName({ letter: "B", alteration: -2 })).toBe("Bbb");
    });
});

describe("chord spelling", () => {
    it("spells the common triads", () => {
        expect(names("C", "maj")).toEqual(["C", "E", "G"]);
        expect(names("A", "min")).toEqual(["A", "C", "E"]);
        expect(names("Eb", "maj")).toEqual(["Eb", "G", "Bb"]);
        expect(names("F#", "min")).toEqual(["F#", "A", "C#"]);
        expect(names("G", "sus4")).toEqual(["G", "C", "D"]);
    });

    it("gives every chord tone the letter its degree demands", () => {
        expect(names("C", "dim7")).toEqual(["C", "Eb", "Gb", "Bbb"]);
        expect(names("G#", "dim7")).toEqual(["G#", "B", "D", "F"]);
        expect(names("Db", "maj7")).toEqual(["Db", "F", "Ab", "C"]);
        expect(names("F", "dom7s11")).toEqual(["F", "A", "C", "Eb", "B"]);
        expect(names("C", "dom13")).toEqual(["C", "E", "G", "Bb", "D", "A"]);
    });

    it("labels intervals by degree and alteration", () => {
        expect(intervalLabel({ degree: 7, alteration: -1 })).toBe("b7");
        expect(intervalLabel({ degree: 7, alteration: -2 })).toBe("bb7");
        expect(intervalLabel({ degree: 11, alteration: 1 })).toBe("#11");
        expect(intervalLabel({ degree: 5, alteration: 0 })).toBe("5");
    });

    it("builds the printed symbol", () => {
        expect(chordSymbol(root("Bb"), quality("min7"))).toBe("Bbm7");
        expect(chordSymbol(root("C"), quality("maj"))).toBe("C");
        expect(chordSymbol(root("F#"), quality("min7b5"))).toBe("F#m7b5");
    });

    it("has a unique identifier and symbol per quality", () => {
        const ids = chordQualities.map((entry) => entry.id);
        const symbols = chordQualities.map((entry) => entry.symbol);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(symbols).size).toBe(symbols.length);
    });

    it("starts every quality on the root and keeps the tones ascending", () => {
        for (const entry of chordQualities) {
            const tones = chordTones(root("C"), entry);
            expect(tones[0]?.label, entry.id).toBe("1");
            const ascending = tones.every(
                (tone, index) =>
                    index === 0 ||
                    tone.semitones > (tones[index - 1]?.semitones ?? 0),
            );
            expect(ascending, entry.id).toBe(true);
        }
    });

    it("never spells two chord tones on the same letter", () => {
        for (const entry of chordQualities) {
            for (const rootNote of chordRoots) {
                const letters = chordTones(rootNote, entry).map(
                    (tone) => tone.note.letter,
                );
                expect(
                    new Set(letters).size,
                    `${noteName(rootNote)}${entry.symbol}`,
                ).toBe(letters.length);
            }
        }
    });

    it("only lets a guitarist drop colour tones", () => {
        expect(omittableDegrees(quality("maj"))).toEqual([]);
        expect(omittableDegrees(quality("power"))).toEqual([]);
        expect(omittableDegrees(quality("dom7"))).toEqual([5]);
        expect(omittableDegrees(quality("min7b5"))).toEqual([]);
        expect(omittableDegrees(quality("dom13"))).toEqual([5, 9]);
        expect(omittableDegrees(quality("dom11"))).toEqual([5, 9, 3]);
    });
});

describe("symbol search", () => {
    it("reads what a learner types", () => {
        expect(parseChordSymbol("C")).toMatchObject({
            quality: { id: "maj" },
        });
        expect(parseChordSymbol("f#m7")).toMatchObject({
            root: { letter: "F", alteration: 1 },
            quality: { id: "min7" },
        });
        expect(parseChordSymbol("Bbmaj7")).toMatchObject({
            root: { letter: "B", alteration: -1 },
            quality: { id: "maj7" },
        });
        expect(parseChordSymbol("Am(add9)")).toMatchObject({
            quality: { id: "minAdd9" },
        });
        expect(parseChordSymbol("G7sus4")).toMatchObject({
            quality: { id: "dom7sus4" },
        });
        expect(parseChordSymbol("D-7")).toMatchObject({
            quality: { id: "min7" },
        });
    });

    it("refuses what it cannot spell", () => {
        expect(parseChordSymbol("")).toBeNull();
        expect(parseChordSymbol("Hm7")).toBeNull();
        expect(parseChordSymbol("Cwhatever")).toBeNull();
    });

    it("round-trips every symbol it prints", () => {
        for (const rootNote of chordRoots) {
            for (const entry of chordQualities) {
                const symbol = chordSymbol(rootNote, entry);
                expect(parseChordSymbol(symbol), symbol).toMatchObject({
                    quality: { id: entry.id },
                });
            }
        }
    });
});
