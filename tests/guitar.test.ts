import { describe, expect, it } from "vitest";
import {
    chordQualities,
    chordRoots,
    chordSymbol,
    chordTones,
    findQuality,
    findRoot,
    omittableDegrees,
} from "../src/music/chords";
import {
    assignFingers,
    findChordShapes,
    stringCount,
    stringMidi,
} from "../src/music/guitar";
import { pitchClassOfMidi } from "../src/music/notes";

function shapesFor(rootName: string, qualityId: string) {
    const root = findRoot(rootName);
    const quality = findQuality(qualityId);
    if (!root || !quality) {
        throw new Error(`Unknown chord: ${rootName} ${qualityId}`);
    }
    const tones = chordTones(root, quality);
    return {
        tones,
        shapes: findChordShapes(tones, {
            omittable: omittableDegrees(quality),
        }),
    };
}

function asText(frets: (number | null)[]): string {
    return frets.map((fret) => (fret === null ? "x" : String(fret))).join("");
}

describe("fretboard shapes", () => {
    it("finds the shapes a chord book prints first", () => {
        expect(asText(shapesFor("C", "maj").shapes[0]?.frets ?? [])).toBe(
            "x32010",
        );
        expect(asText(shapesFor("A", "min").shapes[0]?.frets ?? [])).toBe(
            "x02210",
        );
        expect(asText(shapesFor("E", "maj").shapes[0]?.frets ?? [])).toBe(
            "022100",
        );
        expect(asText(shapesFor("D", "maj").shapes[0]?.frets ?? [])).toBe(
            "xx0232",
        );
        expect(asText(shapesFor("F", "maj").shapes[0]?.frets ?? [])).toBe(
            "133211",
        );
        expect(asText(shapesFor("E", "dom7").shapes[0]?.frets ?? [])).toBe(
            "020100",
        );
    });

    it("marks the barre of a movable shape", () => {
        const shape = shapesFor("F", "maj").shapes[0];
        expect(shape?.barre).toEqual({ fret: 1, from: 0, to: 5 });
        expect(shape?.fingers).toEqual([1, 3, 4, 2, 1, 1]);
    });

    it("plays every chord tone the shape claims", () => {
        for (const rootNote of chordRoots) {
            for (const quality of chordQualities) {
                const tones = chordTones(rootNote, quality);
                const required = tones.filter(
                    (tone) =>
                        !omittableDegrees(quality).includes(
                            tone.interval.degree,
                        ),
                );
                const shapes = findChordShapes(tones, {
                    omittable: omittableDegrees(quality),
                });
                const label = chordSymbol(rootNote, quality);
                expect(shapes.length, label).toBeGreaterThan(0);
                for (const shape of shapes) {
                    const played = new Set(
                        shape.frets.flatMap((fret, index) =>
                            fret === null
                                ? []
                                : [pitchClassOfMidi(stringMidi(index, fret))],
                        ),
                    );
                    for (const tone of required) {
                        expect(
                            played.has(tone.pitchClass),
                            `${label} ${asText(shape.frets)} ${tone.label}`,
                        ).toBe(true);
                    }
                    const omitted = tones
                        .filter((tone) => !played.has(tone.pitchClass))
                        .map((tone) => tone.label);
                    expect(shape.omitted, label).toEqual(omitted);
                }
            }
        }
    });

    it("never asks for a fifth finger or an impossible stretch", () => {
        for (const rootNote of chordRoots) {
            for (const quality of chordQualities) {
                const shapes = findChordShapes(chordTones(rootNote, quality), {
                    omittable: omittableDegrees(quality),
                });
                for (const shape of shapes) {
                    const label = `${chordSymbol(rootNote, quality)} ${asText(shape.frets)}`;
                    const fretted = shape.frets.filter(
                        (fret): fret is number => fret !== null && fret > 0,
                    );
                    const used = new Set(
                        shape.fingers.filter((finger) => finger !== null),
                    );
                    expect(used.size, label).toBeLessThanOrEqual(4);
                    if (fretted.length > 0) {
                        expect(
                            Math.max(...fretted) - Math.min(...fretted),
                            label,
                        ).toBeLessThanOrEqual(3);
                    }
                    expect(shape.frets.length).toBe(stringCount);
                }
            }
        }
    });

    it("keeps the sounding strings next to each other", () => {
        for (const rootNote of chordRoots) {
            for (const quality of chordQualities) {
                for (const shape of findChordShapes(
                    chordTones(rootNote, quality),
                    { omittable: omittableDegrees(quality) },
                )) {
                    const text = asText(shape.frets);
                    expect(/^x*[^x]+x*$/.test(text), text).toBe(true);
                }
            }
        }
    });
});

describe("fingering", () => {
    it("numbers open chords from the lowest fret upwards", () => {
        expect(assignFingers([null, 3, 2, 0, 1, 0])?.fingers).toEqual([
            null,
            3,
            2,
            null,
            1,
            null,
        ]);
        expect(assignFingers([0, 2, 2, 1, 0, 0])?.fingers).toEqual([
            null,
            2,
            3,
            1,
            null,
            null,
        ]);
    });

    it("refuses a barre that would silence an open string", () => {
        expect(assignFingers([1, 0, 3, 2, 1, 1])).toBeNull();
    });

    it("leaves an open chord without a barre", () => {
        expect(assignFingers([null, null, 0, 2, 3, 2])?.barre).toBeNull();
    });
});
