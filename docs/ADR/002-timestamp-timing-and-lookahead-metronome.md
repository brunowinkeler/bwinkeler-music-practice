# ADR 002: Timestamp-based timing and a look-ahead metronome

- Status: Accepted
- Date: 2026-08-21
- Deciders: Bruno Winkeler

## Context

Two different clocks matter during practice, and both are easy to get wrong in
a browser.

The session timer must survive a backgrounded tab, a reload, a device sleeping,
and a clock or timezone change. Counting `setInterval` ticks fails all of these:
browsers throttle timers in hidden tabs, so the recorded time silently shrinks.

The metronome must place clicks precisely. Emitting a sound from a JavaScript
timer inherits main-thread jitter, which is audible as drift at any tempo.

## Decision

**Session time** is derived from wall-clock timestamps. The running entry stores
`runningSince`; pause, resume, and step changes flush the elapsed interval into
the entry's `activeMs`. A negative interval is clamped to zero, so a backwards
clock can never subtract practised time. A 10-second heartbeat persists the
accumulated value while a session runs.

A draft found at start-up is stored as **paused**. The application cannot know
whether the wall-clock time since the last save was practice or a closed laptop,
so it keeps only what was actually recorded and asks the learner to resume or
discard. This can lose up to ten seconds of practice, which is honest, whereas
counting the gap would invent hours.

**Metronome timing** separates scheduling from sound. `BeatScheduler` is pure
maths over the audio clock; `Metronome` runs a 25 ms interval that only fills a
120 ms look-ahead window, and every click is scheduled on the `AudioContext`
clock. The UI beat indicator is driven by a `setTimeout` derived from the same
scheduled time, so audio and visuals agree.

Audio starts only from a user gesture. If the `AudioContext` cannot be created
or resumed, the metronome reports an unavailable state and the visual pulse
keeps working.

## Consequences

- Every timing rule is unit-testable without a browser: `tests/timing.test.ts`
  and `tests/scheduler.test.ts` cover pause, resume, step changes, reload
  recovery, clock regression, beat spacing, accents, and tap tempo.
- The interface must state that metronome audio is guaranteed only in the
  foreground, because no browser API can promise more.
- Automated tests cannot prove audible accuracy; a ten-minute foreground run at
  120 BPM on the target devices stays on the manual release checklist.
