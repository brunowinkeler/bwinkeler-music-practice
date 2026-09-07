import { pitchClassOfMidi } from "./notes";
import type { ChordTone } from "./chords";

/**
 * Fretboard shapes are searched, not stored: a table of memorised diagrams
 * could never cover every root and quality, and the search reproduces the
 * shapes a chord book prints for the ones it does cover.
 */

/** Standard tuning as MIDI numbers, from the low E string upwards. */
export const standardTuning = [40, 45, 50, 55, 59, 64] as const;

export const stringCount = standardTuning.length;

/** Frets a diagram shows at once, and the highest hand position searched. */
export const diagramFrets = 5;
const handSpan = 4;
const highestPosition = 12;

export interface GuitarBarre {
    fret: number;
    from: number;
    to: number;
}

export interface GuitarShape {
    /** One entry per string from the low E upwards; `null` is a muted string. */
    frets: (number | null)[];
    /** Finger 1 to 4 per string, `null` when the string is open or muted. */
    fingers: (number | null)[];
    barre: GuitarBarre | null;
    /** Lowest fret the diagram draws, `1` for an open shape. */
    baseFret: number;
    /** Interval labels the shape leaves out, for example `5`. */
    omitted: string[];
}

export function stringMidi(stringIndex: number, fret: number): number {
    return (standardTuning[stringIndex] ?? 40) + fret;
}

interface FrettedPosition {
    index: number;
    fret: number;
}

export interface Fingering {
    fingers: (number | null)[];
    barre: GuitarBarre | null;
}

/**
 * Assigns fingers the way a teacher would: a barre only when four fingers
 * cannot reach every fretted string, then the remaining fingers from the
 * lowest fret upwards. Returns `null` for a shape no hand can hold.
 */
export function assignFingers(frets: (number | null)[]): Fingering | null {
    const fingers: (number | null)[] = frets.map(() => null);
    const fretted: FrettedPosition[] = [];
    frets.forEach((fret, index) => {
        if (fret !== null && fret > 0) {
            fretted.push({ index, fret });
        }
    });
    if (fretted.length === 0) {
        return { fingers, barre: null };
    }

    if (fretted.length <= 4) {
        [...fretted]
            .sort(
                (left, right) =>
                    left.fret - right.fret || left.index - right.index,
            )
            .forEach((position, order) => {
                fingers[position.index] = order + 1;
            });
        return { fingers, barre: null };
    }

    const minFret = Math.min(...fretted.map((position) => position.fret));
    const atMinFret = fretted.filter((position) => position.fret === minFret);
    const first = atMinFret[0];
    const last = atMinFret[atMinFret.length - 1];
    if (!first || !last || atMinFret.length < 2) {
        return null;
    }
    for (let index = first.index; index <= last.index; index += 1) {
        const fret = frets[index];
        if (fret === null || fret === 0) {
            // A barre would press a string the shape needs open or silent.
            return null;
        }
    }
    const remaining = fretted.filter((position) => position.fret > minFret);
    if (remaining.length > 3) {
        return null;
    }
    for (const position of atMinFret) {
        fingers[position.index] = 1;
    }
    [...remaining]
        .sort(
            (left, right) => left.fret - right.fret || left.index - right.index,
        )
        .forEach((position, order) => {
            fingers[position.index] = order + 2;
        });
    return {
        fingers,
        barre: { fret: minFret, from: first.index, to: last.index },
    };
}

export interface ShapeSearchOptions {
    /** Chord degrees the search may leave out when six strings are not enough. */
    omittable?: number[];
    limit?: number;
}

function fretsKey(frets: (number | null)[]): string {
    return frets.map((fret) => (fret === null ? "x" : String(fret))).join("-");
}

function allowedFrets(position: number): number[] {
    if (position === 0) {
        return [0, 1, 2, 3];
    }
    const frets = [0];
    for (let fret = position; fret < position + handSpan; fret += 1) {
        frets.push(fret);
    }
    return frets;
}

/**
 * Ranks shapes the way a chord chart orders them: as many strings as possible,
 * a hand that stays closed, low on the neck, and as few fingers as the voicing
 * allows. Open strings are free near the nut and awkward higher up the neck.
 * Shapes that keep the root in the bass are ordered ahead of the rest.
 */
function shapeCost(shape: GuitarShape, fretted: number[]): number {
    const sounding = shape.frets.filter((fret) => fret !== null);
    const minFret = fretted.length === 0 ? 0 : Math.min(...fretted);
    const span =
        fretted.length === 0 ? 0 : Math.max(...fretted) - Math.min(...fretted);
    const open = sounding.filter((fret) => fret === 0).length;
    return (
        shape.omitted.length * 3 +
        (stringCount - sounding.length) * 2 +
        fretted.length * 0.35 +
        span * 1.5 +
        open * Math.max(0, minFret - 1) +
        (shape.barre ? 1 : 0) +
        minFret * 0.6
    );
}

export function findChordShapes(
    tones: ChordTone[],
    options: ShapeSearchOptions = {},
): GuitarShape[] {
    const root = tones[0];
    if (!root) {
        return [];
    }
    const omittable = options.omittable ?? [];
    const limit = options.limit ?? 5;
    const required = tones.filter(
        (tone) => !omittable.includes(tone.interval.degree),
    );
    const chordPitchClasses = new Set(tones.map((tone) => tone.pitchClass));
    const minSounding = Math.max(2, Math.min(3, required.length));

    const scored: { shape: GuitarShape; rooted: boolean; cost: number }[] = [];
    const seen = new Set<string>();

    const consider = (from: number, chosen: number[]) => {
        const frets: (number | null)[] = standardTuning.map((_, index) =>
            index < from || index >= from + chosen.length
                ? null
                : (chosen[index - from] ?? null),
        );
        const key = fretsKey(frets);
        if (seen.has(key)) {
            return;
        }
        const played = new Set(
            chosen.map((fret, offset) =>
                pitchClassOfMidi(stringMidi(from + offset, fret)),
            ),
        );
        if (required.some((tone) => !played.has(tone.pitchClass))) {
            return;
        }
        const fingering = assignFingers(frets);
        if (!fingering) {
            return;
        }
        seen.add(key);
        const fretted = chosen.filter((fret) => fret > 0);
        const highest = fretted.length === 0 ? 0 : Math.max(...fretted);
        const lowest = fretted.length === 0 ? 1 : Math.min(...fretted);
        const shape: GuitarShape = {
            frets,
            fingers: fingering.fingers,
            barre: fingering.barre,
            baseFret: highest <= diagramFrets ? 1 : lowest,
            omitted: tones
                .filter((tone) => !played.has(tone.pitchClass))
                .map((tone) => tone.label),
        };
        const bassIsRoot =
            pitchClassOfMidi(stringMidi(from, chosen[0] ?? 0)) ===
            root.pitchClass;
        scored.push({
            shape,
            rooted: bassIsRoot,
            cost: shapeCost(shape, fretted),
        });
    };

    for (let position = 0; position <= highestPosition; position += 1) {
        const positionFrets = allowedFrets(position);
        const perString = standardTuning.map((_, index) =>
            positionFrets.filter((fret) =>
                chordPitchClasses.has(
                    pitchClassOfMidi(stringMidi(index, fret)),
                ),
            ),
        );
        for (let from = 0; from <= stringCount - minSounding; from += 1) {
            const chosen: number[] = [];
            const walk = (index: number) => {
                if (chosen.length >= minSounding) {
                    consider(from, chosen);
                }
                if (index >= stringCount) {
                    return;
                }
                for (const fret of perString[index] ?? []) {
                    chosen.push(fret);
                    walk(index + 1);
                    chosen.pop();
                }
            };
            walk(from);
        }
    }

    scored.sort(
        (left, right) =>
            Number(right.rooted) - Number(left.rooted) ||
            left.cost - right.cost,
    );
    const shapes: GuitarShape[] = [];
    const perPosition = new Map<number, number>();
    for (const candidate of scored) {
        const used = perPosition.get(candidate.shape.baseFret) ?? 0;
        if (used >= 2) {
            continue;
        }
        perPosition.set(candidate.shape.baseFret, used + 1);
        shapes.push(candidate.shape);
        if (shapes.length === limit) {
            break;
        }
    }
    return shapes;
}
