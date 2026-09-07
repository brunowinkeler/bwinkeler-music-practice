import { useMemo, useState } from "react";
import { useAppStore } from "../../app/store";
import {
    chordFamilies,
    chordQualities,
    chordSymbol,
    chordTones,
    omittableDegrees,
    parseChordSymbol,
    resolveChord,
    rootNames,
    type ChordTone,
} from "../../music/chords";
import { noteName, pitchClassOfMidi } from "../../music/notes";
import {
    findChordShapes,
    stringMidi,
    type GuitarShape,
} from "../../music/guitar";
import {
    inversionCount,
    invertVoicing,
    pitchLabel,
    rootPositionVoicing,
} from "../../music/piano";
import {
    chordFamilyMessageKey,
    chordQualityMessageKey,
    type MessageKey,
} from "../../i18n";
import { GuitarDiagram } from "./GuitarDiagram";
import { PianoDiagram } from "./PianoDiagram";

export type ChordInstrument = "guitar" | "piano";

export interface ChordSelection {
    root: string;
    quality: string;
    instrument: ChordInstrument;
}

export const defaultChordSelection: ChordSelection = {
    root: "C",
    quality: "maj",
    instrument: "piano",
};

const inversionKeys: MessageKey[] = [
    "chords.inversionRoot",
    "chords.inversionFirst",
    "chords.inversionSecond",
    "chords.inversionThird",
];

function fretText(shape: GuitarShape): string {
    return shape.frets
        .map((fret) => (fret === null ? "×" : String(fret)))
        .join(" ");
}

function shapeNotes(shape: GuitarShape, byPitchClass: Map<number, ChordTone>) {
    return shape.frets
        .map((fret, index) =>
            fret === null
                ? null
                : (byPitchClass.get(pitchClassOfMidi(stringMidi(index, fret)))
                      ?.name ?? null),
        )
        .filter((name): name is string => name !== null);
}

/**
 * The dictionary itself: one chord at a time, shown as fretboard shapes or as
 * keys, with a table that repeats every diagram as text.
 */
export function ChordExplorer({
    selection,
    onChange,
}: {
    selection: ChordSelection;
    onChange: (next: ChordSelection) => void;
}) {
    const { t } = useAppStore();
    const [query, setQuery] = useState("");
    const [unknownQuery, setUnknownQuery] = useState(false);
    const [requestedInversion, setRequestedInversion] = useState(0);

    const chord = useMemo(
        () => resolveChord(selection.root, selection.quality),
        [selection.root, selection.quality],
    );
    const tones = useMemo(() => chordTones(chord.root, chord.quality), [chord]);
    const byPitchClass = useMemo(() => {
        const map = new Map<number, ChordTone>();
        for (const tone of tones) {
            if (!map.has(tone.pitchClass)) {
                map.set(tone.pitchClass, tone);
            }
        }
        return map;
    }, [tones]);
    const shapes = useMemo(
        () =>
            findChordShapes(tones, {
                omittable: omittableDegrees(chord.quality),
            }),
        [tones, chord],
    );

    const inversions = inversionCount(tones);
    const inversion = Math.min(requestedInversion, inversions - 1);
    const voicing = useMemo(
        () => invertVoicing(rootPositionVoicing(tones), inversion),
        [tones, inversion],
    );
    const keyLabels = useMemo(() => {
        const labels = new Map<number, string>();
        for (const midi of voicing) {
            const tone = byPitchClass.get(pitchClassOfMidi(midi));
            if (tone) {
                labels.set(midi, tone.name);
            }
        }
        return labels;
    }, [voicing, byPitchClass]);

    const symbol = chordSymbol(chord.root, chord.quality);
    const noteList = tones.map((tone) => tone.name).join(" · ");

    const search = (value: string) => {
        setQuery(value);
        if (value.trim() === "") {
            setUnknownQuery(false);
            return;
        }
        const parsed = parseChordSymbol(value);
        if (!parsed) {
            setUnknownQuery(true);
            return;
        }
        setUnknownQuery(false);
        onChange({
            ...selection,
            root: noteName(parsed.root),
            quality: parsed.quality.id,
        });
    };

    return (
        <div className="chord-explorer">
            <div className="field-row">
                <div className="field">
                    <label htmlFor="chord-search">{t("chords.search")}</label>
                    <input
                        id="chord-search"
                        type="search"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t("chords.searchPlaceholder")}
                        value={query}
                        onChange={(event) => {
                            search(event.target.value);
                        }}
                        aria-describedby="chord-search-hint"
                    />
                    <p
                        id="chord-search-hint"
                        className={unknownQuery ? "field-error" : "field-hint"}
                    >
                        {unknownQuery
                            ? t("chords.searchUnknown")
                            : t("chords.searchHint")}
                    </p>
                </div>
                <div className="field field-narrow">
                    <label htmlFor="chord-root">{t("chords.root")}</label>
                    <select
                        id="chord-root"
                        value={selection.root}
                        onChange={(event) => {
                            onChange({
                                ...selection,
                                root: event.target.value,
                            });
                        }}
                    >
                        {rootNames.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="chord-quality">{t("chords.quality")}</label>
                    <select
                        id="chord-quality"
                        value={selection.quality}
                        onChange={(event) => {
                            onChange({
                                ...selection,
                                quality: event.target.value,
                            });
                        }}
                    >
                        {chordFamilies.map((family) => (
                            <optgroup
                                key={family}
                                label={t(chordFamilyMessageKey(family))}
                            >
                                {chordQualities
                                    .filter(
                                        (quality) => quality.family === family,
                                    )
                                    .map((quality) => (
                                        <option
                                            key={quality.id}
                                            value={quality.id}
                                        >
                                            {`${selection.root}${quality.symbol} — ${t(
                                                chordQualityMessageKey(
                                                    quality.id,
                                                ),
                                            )}`}
                                        </option>
                                    ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
            </div>

            <section className="card">
                <div className="card-head">
                    <h2 id="chord-symbol" className="chord-symbol">
                        {symbol}
                    </h2>
                    <span className="badge">
                        {t(chordQualityMessageKey(chord.quality.id))}
                    </span>
                </div>
                <p className="chord-tones" id="chord-tones">
                    {tones.map((tone) => (
                        <span key={tone.label}>
                            <strong>{tone.name}</strong>
                            <span className="muted small">{tone.label}</span>
                        </span>
                    ))}
                </p>
            </section>

            <div
                className="tabs"
                role="tablist"
                aria-label={t("chords.instrument")}
            >
                <button
                    type="button"
                    role="tab"
                    id="tab-piano"
                    aria-selected={selection.instrument === "piano"}
                    aria-controls="panel-piano"
                    onClick={() => {
                        onChange({ ...selection, instrument: "piano" });
                    }}
                >
                    {t("chords.piano")}
                </button>
                <button
                    type="button"
                    role="tab"
                    id="tab-guitar"
                    aria-selected={selection.instrument === "guitar"}
                    aria-controls="panel-guitar"
                    onClick={() => {
                        onChange({ ...selection, instrument: "guitar" });
                    }}
                >
                    {t("chords.guitar")}
                </button>
            </div>

            {selection.instrument === "piano" ? (
                <section
                    id="panel-piano"
                    role="tabpanel"
                    aria-labelledby="tab-piano"
                    className="card"
                >
                    <div className="field field-narrow">
                        <label htmlFor="chord-inversion">
                            {t("chords.inversion")}
                        </label>
                        <select
                            id="chord-inversion"
                            value={inversion}
                            onChange={(event) => {
                                setRequestedInversion(
                                    Number(event.target.value),
                                );
                            }}
                        >
                            {inversionKeys
                                .slice(0, inversions)
                                .map((key, index) => (
                                    <option key={key} value={index}>
                                        {t(key)}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <PianoDiagram
                        notes={voicing}
                        labels={keyLabels}
                        label={t("chords.keyboardLabel", {
                            chord: symbol,
                            notes: noteList,
                        })}
                    />
                    <table className="data-table">
                        <caption className="visually-hidden">
                            {t("chords.notes")}
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">{t("chords.tableInterval")}</th>
                                <th scope="col">{t("chords.tableNote")}</th>
                                <th scope="col">{t("chords.tablePitch")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {voicing.map((midi) => {
                                const tone = byPitchClass.get(
                                    pitchClassOfMidi(midi),
                                );
                                return (
                                    <tr key={midi}>
                                        <th scope="row">{tone?.label ?? ""}</th>
                                        <td>{tone?.name ?? ""}</td>
                                        <td>
                                            {tone
                                                ? pitchLabel(tone.note, midi)
                                                : ""}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            ) : (
                <section
                    id="panel-guitar"
                    role="tabpanel"
                    aria-labelledby="tab-guitar"
                    className="card"
                >
                    <h3>{t("chords.shapes")}</h3>
                    {shapes.length === 0 ? (
                        <p className="muted">{t("chords.noShapes")}</p>
                    ) : (
                        <ul className="chord-shapes">
                            {shapes.map((shape) => (
                                <li
                                    className="chord-shape"
                                    key={fretText(shape)}
                                >
                                    <GuitarDiagram
                                        shape={shape}
                                        label={t("chords.diagramLabel", {
                                            chord: symbol,
                                            frets: fretText(shape),
                                        })}
                                    />
                                    <p className="chord-shape-title">
                                        {shape.baseFret === 1
                                            ? t("chords.shapeOpen")
                                            : t("chords.shapePosition", {
                                                  fret: shape.baseFret,
                                              })}
                                    </p>
                                    <p className="chord-shape-frets">
                                        {fretText(shape)}
                                    </p>
                                    <p className="muted small">
                                        {t("chords.shapeNotes", {
                                            notes: shapeNotes(
                                                shape,
                                                byPitchClass,
                                            ).join(" "),
                                        })}
                                    </p>
                                    {shape.barre ? (
                                        <p className="muted small">
                                            {t("chords.shapeBarre", {
                                                fret: shape.barre.fret,
                                            })}
                                        </p>
                                    ) : null}
                                    {shape.omitted.length > 0 ? (
                                        <p className="muted small">
                                            {t("chords.omits", {
                                                tones: shape.omitted.join(", "),
                                            })}
                                        </p>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="muted small">{t("chords.tuning")}</p>
                </section>
            )}
        </div>
    );
}
