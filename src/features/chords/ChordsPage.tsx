import { useNavigate, useSearchParams } from "react-router";
import { useAppStore } from "../../app/store";
import { chordSymbol, chordTones, resolveChord } from "../../music/chords";
import { noteName } from "../../music/notes";
import { Icon } from "../../components/Icon";
import {
    ChordExplorer,
    defaultChordSelection,
    type ChordSelection,
} from "./ChordExplorer";

export function ChordsPage() {
    const store = useAppStore();
    const { t, areas } = store;
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();

    const chord = resolveChord(
        params.get("root") ?? defaultChordSelection.root,
        params.get("quality") ?? defaultChordSelection.quality,
    );
    // Resolving first keeps an edited address from selecting a chord that does
    // not exist.
    const selection: ChordSelection = {
        root: noteName(chord.root),
        quality: chord.quality.id,
        instrument: params.get("instrument") === "guitar" ? "guitar" : "piano",
    };

    const createActivity = async () => {
        const area =
            areas.find(
                (candidate) => candidate.builtInKey === "scalesChords",
            ) ?? areas[0];
        if (!area) {
            return;
        }
        const activity = await store.createActivity({
            title: t("chords.activityTitle", {
                chord: chordSymbol(chord.root, chord.quality),
                instrument: t(
                    selection.instrument === "guitar"
                        ? "chords.guitar"
                        : "chords.piano",
                ),
            }),
            practiceAreaId: area.id,
            instructions: t("chords.activityInstructions", {
                notes: chordTones(chord.root, chord.quality)
                    .map((tone) => tone.name)
                    .join(" "),
            }),
        });
        if (activity) {
            void navigate(`/activities/${activity.id}`);
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("chords.title")}</h1>
            </header>
            <p className="muted">{t("chords.description")}</p>

            <ChordExplorer
                selection={selection}
                onChange={(next) => {
                    setParams(
                        {
                            root: next.root,
                            quality: next.quality,
                            instrument: next.instrument,
                        },
                        { replace: true },
                    );
                }}
            />

            <div className="row row-wrap">
                <button
                    type="button"
                    id="create-chord-activity"
                    className="button"
                    onClick={() => {
                        void createActivity();
                    }}
                >
                    <Icon name="plus" />
                    {t("chords.createActivity")}
                </button>
            </div>

            <p className="muted small">{t("chords.spellingNotice")}</p>
        </div>
    );
}
