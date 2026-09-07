import {
    letterAbove,
    noteName,
    noteOnLetter,
    parseNote,
    pitchClass,
    type Note,
} from "./notes";

/**
 * The chord dictionary. Qualities are stored as scale degrees rather than as
 * semitone sets, so every chord can be spelled correctly for any root and the
 * same table serves the keyboard and the fretboard.
 */

export interface ChordInterval {
    /** Degree of the major scale: 1, 2, 3, 4, 5, 6, 7, 9, 11, or 13. */
    degree: number;
    /** Semitones away from that degree: -2 to 1. */
    alteration: number;
}

const degreeSemitones: Record<number, number> = {
    1: 0,
    2: 2,
    3: 4,
    4: 5,
    5: 7,
    6: 9,
    7: 11,
    9: 14,
    11: 17,
    13: 21,
};

export function intervalSemitones(interval: ChordInterval): number {
    return (degreeSemitones[interval.degree] ?? 0) + interval.alteration;
}

export function intervalLabel(interval: ChordInterval): string {
    const accidental =
        interval.alteration === 0
            ? ""
            : (interval.alteration > 0 ? "#" : "b").repeat(
                  Math.abs(interval.alteration),
              );
    return accidental + String(interval.degree);
}

export const chordFamilies = [
    "triads",
    "sixths",
    "sevenths",
    "ninths",
    "extended",
] as const;

export type ChordFamily = (typeof chordFamilies)[number];

export interface ChordQuality {
    /** Stable key used by the message catalogues and by the route parameters. */
    id: string;
    family: ChordFamily;
    /** Suffix appended to the root name, empty for a major triad. */
    symbol: string;
    intervals: ChordInterval[];
}

function degrees(...specs: (number | [number, number])[]): ChordInterval[] {
    return specs.map((spec) =>
        typeof spec === "number"
            ? { degree: spec, alteration: 0 }
            : { degree: spec[0], alteration: spec[1] },
    );
}

const flat3: [number, number] = [3, -1];
const flat5: [number, number] = [5, -1];
const sharp5: [number, number] = [5, 1];
const flat7: [number, number] = [7, -1];
const doubleFlat7: [number, number] = [7, -2];
const flat9: [number, number] = [9, -1];
const sharp9: [number, number] = [9, 1];
const sharp11: [number, number] = [11, 1];
const flat13: [number, number] = [13, -1];

export const chordQualities: ChordQuality[] = [
    { id: "maj", family: "triads", symbol: "", intervals: degrees(1, 3, 5) },
    {
        id: "min",
        family: "triads",
        symbol: "m",
        intervals: degrees(1, flat3, 5),
    },
    {
        id: "dim",
        family: "triads",
        symbol: "dim",
        intervals: degrees(1, flat3, flat5),
    },
    {
        id: "aug",
        family: "triads",
        symbol: "aug",
        intervals: degrees(1, 3, sharp5),
    },
    {
        id: "sus2",
        family: "triads",
        symbol: "sus2",
        intervals: degrees(1, 2, 5),
    },
    {
        id: "sus4",
        family: "triads",
        symbol: "sus4",
        intervals: degrees(1, 4, 5),
    },
    { id: "power", family: "triads", symbol: "5", intervals: degrees(1, 5) },

    {
        id: "six",
        family: "sixths",
        symbol: "6",
        intervals: degrees(1, 3, 5, 6),
    },
    {
        id: "min6",
        family: "sixths",
        symbol: "m6",
        intervals: degrees(1, flat3, 5, 6),
    },
    {
        id: "sixNine",
        family: "sixths",
        symbol: "6/9",
        intervals: degrees(1, 3, 5, 6, 9),
    },
    {
        id: "add9",
        family: "sixths",
        symbol: "add9",
        intervals: degrees(1, 3, 5, 9),
    },
    {
        id: "minAdd9",
        family: "sixths",
        symbol: "m(add9)",
        intervals: degrees(1, flat3, 5, 9),
    },
    {
        id: "add11",
        family: "sixths",
        symbol: "add11",
        intervals: degrees(1, 3, 5, 11),
    },

    {
        id: "maj7",
        family: "sevenths",
        symbol: "maj7",
        intervals: degrees(1, 3, 5, 7),
    },
    {
        id: "dom7",
        family: "sevenths",
        symbol: "7",
        intervals: degrees(1, 3, 5, flat7),
    },
    {
        id: "min7",
        family: "sevenths",
        symbol: "m7",
        intervals: degrees(1, flat3, 5, flat7),
    },
    {
        id: "min7b5",
        family: "sevenths",
        symbol: "m7b5",
        intervals: degrees(1, flat3, flat5, flat7),
    },
    {
        id: "dim7",
        family: "sevenths",
        symbol: "dim7",
        intervals: degrees(1, flat3, flat5, doubleFlat7),
    },
    {
        id: "minMaj7",
        family: "sevenths",
        symbol: "m(maj7)",
        intervals: degrees(1, flat3, 5, 7),
    },
    {
        id: "dom7sus4",
        family: "sevenths",
        symbol: "7sus4",
        intervals: degrees(1, 4, 5, flat7),
    },
    {
        id: "dom7s5",
        family: "sevenths",
        symbol: "7#5",
        intervals: degrees(1, 3, sharp5, flat7),
    },
    {
        id: "dom7b5",
        family: "sevenths",
        symbol: "7b5",
        intervals: degrees(1, 3, flat5, flat7),
    },
    {
        id: "maj7s5",
        family: "sevenths",
        symbol: "maj7#5",
        intervals: degrees(1, 3, sharp5, 7),
    },

    {
        id: "dom9",
        family: "ninths",
        symbol: "9",
        intervals: degrees(1, 3, 5, flat7, 9),
    },
    {
        id: "maj9",
        family: "ninths",
        symbol: "maj9",
        intervals: degrees(1, 3, 5, 7, 9),
    },
    {
        id: "min9",
        family: "ninths",
        symbol: "m9",
        intervals: degrees(1, flat3, 5, flat7, 9),
    },
    {
        id: "dom7b9",
        family: "ninths",
        symbol: "7b9",
        intervals: degrees(1, 3, 5, flat7, flat9),
    },
    {
        id: "dom7s9",
        family: "ninths",
        symbol: "7#9",
        intervals: degrees(1, 3, 5, flat7, sharp9),
    },
    {
        id: "dom9sus4",
        family: "ninths",
        symbol: "9sus4",
        intervals: degrees(1, 4, 5, flat7, 9),
    },

    {
        id: "dom11",
        family: "extended",
        symbol: "11",
        intervals: degrees(1, 3, 5, flat7, 9, 11),
    },
    {
        id: "min11",
        family: "extended",
        symbol: "m11",
        intervals: degrees(1, flat3, 5, flat7, 9, 11),
    },
    {
        id: "dom7s11",
        family: "extended",
        symbol: "7#11",
        intervals: degrees(1, 3, 5, flat7, sharp11),
    },
    {
        id: "maj7s11",
        family: "extended",
        symbol: "maj7#11",
        intervals: degrees(1, 3, 5, 7, sharp11),
    },
    {
        id: "dom13",
        family: "extended",
        symbol: "13",
        intervals: degrees(1, 3, 5, flat7, 9, 13),
    },
    {
        id: "maj13",
        family: "extended",
        symbol: "maj13",
        intervals: degrees(1, 3, 5, 7, 9, 13),
    },
    {
        id: "min13",
        family: "extended",
        symbol: "m13",
        intervals: degrees(1, flat3, 5, flat7, 9, 13),
    },
    {
        id: "dom7b13",
        family: "extended",
        symbol: "7b13",
        intervals: degrees(1, 3, 5, flat7, flat13),
    },
];

/** Every root spelling a lead sheet uses, both enharmonic names included. */
export const chordRoots: Note[] = [
    { letter: "C", alteration: 0 },
    { letter: "C", alteration: 1 },
    { letter: "D", alteration: -1 },
    { letter: "D", alteration: 0 },
    { letter: "D", alteration: 1 },
    { letter: "E", alteration: -1 },
    { letter: "E", alteration: 0 },
    { letter: "F", alteration: 0 },
    { letter: "F", alteration: 1 },
    { letter: "G", alteration: -1 },
    { letter: "G", alteration: 0 },
    { letter: "G", alteration: 1 },
    { letter: "A", alteration: -1 },
    { letter: "A", alteration: 0 },
    { letter: "A", alteration: 1 },
    { letter: "B", alteration: -1 },
    { letter: "B", alteration: 0 },
];

export const rootNames: string[] = chordRoots.map(noteName);

export interface ChordTone {
    interval: ChordInterval;
    label: string;
    note: Note;
    name: string;
    pitchClass: number;
    /** Semitones above the root, before any octave is chosen. */
    semitones: number;
}

export function chordTones(root: Note, quality: ChordQuality): ChordTone[] {
    return quality.intervals.map((interval) => {
        const semitones = intervalSemitones(interval);
        const note = noteOnLetter(
            root,
            letterAbove(root.letter, (interval.degree - 1) % 7),
            semitones,
        );
        return {
            interval,
            label: intervalLabel(interval),
            note,
            name: noteName(note),
            pitchClass: pitchClass(note),
            semitones,
        };
    });
}

export function chordSymbol(root: Note, quality: ChordQuality): string {
    return noteName(root) + quality.symbol;
}

export function findQuality(id: string): ChordQuality | undefined {
    return chordQualities.find((quality) => quality.id === id);
}

export function findRoot(name: string): Note | undefined {
    return chordRoots.find((root) => noteName(root) === name);
}

/** Falls back to C major so a stale link or query string cannot break a view. */
export function resolveChord(
    rootName: string,
    qualityId: string,
): { root: Note; quality: ChordQuality } {
    const fallback: ChordQuality = {
        id: "maj",
        family: "triads",
        symbol: "",
        intervals: degrees(1, 3, 5),
    };
    return {
        root: findRoot(rootName) ?? { letter: "C", alteration: 0 },
        quality: findQuality(qualityId) ?? findQuality("maj") ?? fallback,
    };
}

/**
 * Degrees a guitarist may drop when six strings cannot carry every tone. A
 * perfect fifth goes first, then the ninth of an eleventh or thirteenth chord,
 * and finally the third of a dominant eleventh, where it clashes with the
 * eleventh. Altered tones and the third of every other chord always sound.
 */
export function omittableDegrees(quality: ChordQuality): number[] {
    if (quality.intervals.length < 4) {
        return [];
    }
    const omittable: number[] = [];
    const has = (degree: number, alteration = 0) =>
        quality.intervals.some(
            (interval) =>
                interval.degree === degree &&
                interval.alteration === alteration,
        );
    if (has(5)) {
        omittable.push(5);
    }
    if (has(9) && (has(11) || has(13))) {
        omittable.push(9);
    }
    if (quality.id === "dom11") {
        omittable.push(3);
    }
    return omittable;
}

const symbolAliases: Record<string, string> = {
    M: "maj",
    maj: "maj",
    major: "maj",
    min: "min",
    "-": "min",
    "°": "dim",
    o: "dim",
    "+": "aug",
    M7: "maj7",
    ma7: "maj7",
    Ma7: "maj7",
    Δ: "maj7",
    Δ7: "maj7",
    min7: "min7",
    "-7": "min7",
    ø: "min7b5",
    "m7-5": "min7b5",
    "°7": "dim7",
    dim: "dim",
    mmaj7: "minMaj7",
    "m#5": "aug",
    "7+": "dom7s5",
    "7alt": "dom7s9",
    sus: "sus4",
    "7sus": "dom7sus4",
    add2: "add9",
    "9/6": "sixNine",
};

/** Reads a typed symbol such as `F#m7b5`; the search box is its only caller. */
export function parseChordSymbol(
    text: string,
): { root: Note; quality: ChordQuality } | null {
    const trimmed = text.trim().replaceAll("♯", "#").replaceAll("♭", "b");
    const match = /^([A-Ga-g](?:#{1,2}|b{1,2})?)(.*)$/.exec(trimmed);
    if (!match) {
        return null;
    }
    const root = parseNote(match[1] ?? "");
    if (!root) {
        return null;
    }
    const suffix = (match[2] ?? "").replaceAll(/[()\s]/g, "");
    const quality =
        chordQualities.find(
            (candidate) => candidate.symbol.replaceAll(/[()]/g, "") === suffix,
        ) ??
        findQuality(symbolAliases[suffix] ?? "") ??
        (suffix === "" ? findQuality("maj") : undefined);
    return quality ? { root, quality } : null;
}
