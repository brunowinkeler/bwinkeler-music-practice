# ADR 005: A generated chord dictionary for guitar and keyboard

- Status: Accepted
- Date: 2026-09-07
- Deciders: Bruno Winkeler

## Context

Practice sessions kept stalling on the same interruption: looking a chord up
somewhere else. A phone browser, a chord site, an advertisement, and a lost
minute of practice, several times per session. The learner also plays guitar,
so the answer had to cover a fretboard as well as a keyboard.

The obvious implementation, a table of memorised diagrams, does not survive
contact with the requirement. Seventeen root spellings times thirty-seven
qualities is six hundred and twenty-nine chords, each needing several shapes.
Such a table would be large, unverifiable, and wrong in the corners nobody
checks. Bundling a chord library instead would break the local-first rule that
every asset ships from this origin, and none of the popular ones is small.

## Decision

Generate the dictionary from theory at runtime, in four pure modules under
`src/music/`, and keep it inside the existing static build.

- **A quality is a list of scale degrees**, not a set of semitones. Spelling
  follows the degree, so each tone takes its own letter and a diminished
  seventh on C reads `C Eb Gb Bbb`. The interface states this rule rather than
  hiding double accidentals behind a friendlier enharmonic.
- **Fretboard shapes are searched, then ranked.** For each hand position the
  search keeps the frets that sound a chord tone, walks contiguous string
  ranges, rejects anything four fingers or one barre cannot hold, and scores the
  survivors by sounding strings, hand span, position, open strings, and finger
  count. Shapes with the root in the bass come first. The ranking is a
  heuristic, so the tests pin it to the shapes a chord book prints: `x32010`
  for C, `022100` for E, `xx0232` for D, and the barre `133211` for F.
- **A fifth is the first tone dropped** when six strings cannot carry the
  chord, then the ninth of an eleventh or thirteenth, and the third only in a
  dominant eleventh where it clashes. Altered tones never go, and every shape
  declares what it omits.
- **The dictionary owns no data.** It reads nothing from IndexedDB and writes
  nothing to it, so the schema, the backup format, and their versions are
  untouched. The single bridge to practice is a button that creates an activity
  in the scales and chords area, plus the lookup dialog available during a
  session.
- **Standard tuning only**, and no chord audio in this release.

## Consequences

- The search runs for every chord the learner selects; the sweep over all six
  hundred and twenty-nine chords stays around two milliseconds each, which keeps
  the interaction instantaneous and the memoisation trivial.
- Playability is a model, not a hand. A shape can pass the four-finger rule and
  still feel awkward; the ranking terms exist to push those below the shapes a
  guitarist expects, and they are tuned against named chords in the tests.
- The generator makes a sixth top-level destination unavoidable, and six labels
  do not fit one row at 320 CSS pixels, so the bottom navigation becomes two
  rows of three on the narrowest phones.
- Correct spelling wins over familiarity: `Dbdim7` shows `Db Fb Abb Cbb`. Both
  enharmonic roots are offered, so a learner who wants `C#dim7` can pick it.
- Another tuning, a scale dictionary, or audible chords are additive: a tuning
  is an array, and the diagrams already take their geometry from pure functions.
