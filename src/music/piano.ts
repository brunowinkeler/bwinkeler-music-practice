import {
    isBlackKey,
    noteName,
    octaveOfMidi,
    wrapPitchClass,
    type Note,
} from "./notes";
import type { ChordTone } from "./chords";

/**
 * Keyboard voicings and the geometry a keyboard diagram is drawn from. Pure
 * numbers: the component only turns them into rectangles.
 */

/** C3. Root-position voicings start in the octave below middle C. */
export const voicingBaseMidi = 48;

export function rootPositionVoicing(tones: ChordTone[]): number[] {
    const root = tones[0];
    if (!root) {
        return [];
    }
    const rootMidi = voicingBaseMidi + wrapPitchClass(root.pitchClass);
    return tones.map((tone) => rootMidi + tone.semitones);
}

/** Moves the lowest note above the top note once per inversion. */
export function invertVoicing(notes: number[], inversion: number): number[] {
    const voiced = [...notes].sort((left, right) => left - right);
    for (let step = 0; step < inversion; step += 1) {
        const lowest = voiced.shift();
        const highest = voiced[voiced.length - 1];
        if (lowest === undefined || highest === undefined) {
            return lowest === undefined ? voiced : [lowest];
        }
        let raised = lowest;
        while (raised <= highest) {
            raised += 12;
        }
        voiced.push(raised);
    }
    return voiced;
}

export function inversionCount(tones: ChordTone[]): number {
    return Math.min(tones.length, 4);
}

export interface PianoKey {
    midi: number;
    black: boolean;
    x: number;
}

export interface PianoLayout {
    keys: PianoKey[];
    whiteWidth: number;
    whiteHeight: number;
    blackWidth: number;
    blackHeight: number;
    width: number;
    height: number;
}

const whiteWidth = 22;
const whiteHeight = 108;
const blackWidth = 13;
const blackHeight = 66;

/** Widens the drawn range to whole octaves, never fewer than two. */
export function keyboardRange(notes: number[]): { from: number; to: number } {
    if (notes.length === 0) {
        return { from: voicingBaseMidi, to: voicingBaseMidi + 23 };
    }
    const lowest = Math.min(...notes);
    const highest = Math.max(...notes);
    const from = Math.floor(lowest / 12) * 12;
    let to = Math.floor(highest / 12) * 12 + 11;
    while (to - from < 23) {
        to += 12;
    }
    return { from, to };
}

export function keyboardLayout(from: number, to: number): PianoLayout {
    const keys: PianoKey[] = [];
    let whiteIndex = 0;
    for (let midi = from; midi <= to; midi += 1) {
        const black = isBlackKey(midi);
        if (black) {
            keys.push({
                midi,
                black,
                x: whiteIndex * whiteWidth - blackWidth / 2,
            });
        } else {
            keys.push({ midi, black, x: whiteIndex * whiteWidth });
            whiteIndex += 1;
        }
    }
    return {
        keys,
        whiteWidth,
        whiteHeight,
        blackWidth,
        blackHeight,
        width: whiteIndex * whiteWidth,
        height: whiteHeight,
    };
}

/**
 * Scientific pitch notation, for example `Eb4`. The octave follows the spelled
 * letter, so `Cb4` stays in the fourth octave even though it sounds as `B3`.
 */
export function pitchLabel(note: Note, midi: number): string {
    return `${noteName(note)}${String(octaveOfMidi(midi - note.alteration))}`;
}
