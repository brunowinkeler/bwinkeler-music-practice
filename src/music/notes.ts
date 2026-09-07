/**
 * Note spelling. A chord is spelled upwards from its root letter, so every
 * chord tone keeps the letter its degree demands and only the accidental moves.
 * That is what makes a diminished seventh read `Bbb` instead of `A`.
 */

export const letters = ["C", "D", "E", "F", "G", "A", "B"] as const;

export type Letter = (typeof letters)[number];

export interface Note {
    letter: Letter;
    /** Semitones away from the natural letter: -2 (double flat) to 2 (double sharp). */
    alteration: number;
}

const naturalSemitone: Record<Letter, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
};

export function wrapPitchClass(semitones: number): number {
    return ((semitones % 12) + 12) % 12;
}

export function pitchClass(note: Note): number {
    return wrapPitchClass(naturalSemitone[note.letter] + note.alteration);
}

export function accidentalText(alteration: number): string {
    if (alteration === 0) {
        return "";
    }
    return (alteration > 0 ? "#" : "b").repeat(Math.abs(alteration));
}

export function noteName(note: Note): string {
    return note.letter + accidentalText(note.alteration);
}

/** Letter `steps` positions above `letter`, wrapping through the alphabet. */
export function letterAbove(letter: Letter, steps: number): Letter {
    const index = (letters.indexOf(letter) + steps) % letters.length;
    return letters[index] ?? letter;
}

/** Spells the note that is `semitones` above `root` on the given letter. */
export function noteOnLetter(
    root: Note,
    letter: Letter,
    semitones: number,
): Note {
    const distance = wrapPitchClass(
        pitchClass(root) + semitones - naturalSemitone[letter],
    );
    return { letter, alteration: distance > 6 ? distance - 12 : distance };
}

/** Accepts `C`, `c`, `Bb`, `F#`, `Ebb`; the accidental stays case-sensitive. */
export function parseNote(text: string): Note | null {
    const match = /^\s*([A-Ga-g])(#{1,2}|b{1,2}|♯{1,2}|♭{1,2})?\s*$/.exec(text);
    if (!match) {
        return null;
    }
    const letter = (match[1] ?? "C").toUpperCase() as Letter;
    const accidental = match[2] ?? "";
    const flat = accidental.startsWith("b") || accidental.startsWith("♭");
    return { letter, alteration: (flat ? -1 : 1) * accidental.length };
}

/** MIDI 60 is middle C, so every octave starts twelve semitones apart. */
export function pitchClassOfMidi(midi: number): number {
    return wrapPitchClass(midi);
}

export function octaveOfMidi(midi: number): number {
    return Math.floor(midi / 12) - 1;
}

const blackPitchClasses = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
    return blackPitchClasses.has(pitchClassOfMidi(midi));
}
