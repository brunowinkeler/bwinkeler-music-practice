import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAppStore } from "../../app/store";
import { useNow } from "../../app/hooks";
import { Icon } from "../../components/Icon";
import { ConfirmDialog, Modal } from "../../components/Modal";
import { MetronomePanel } from "./MetronomePanel";
import {
    ChordExplorer,
    defaultChordSelection,
    type ChordSelection,
} from "../chords/ChordExplorer";
import {
    completeSession,
    entryElapsedMs,
    flushRunningTime,
    formatDuration,
    minutesFromMs,
    moveToEntry,
    pauseSession,
    resumeSession,
    sessionElapsedMs,
    totalRecordedMs,
} from "../../session/timing";
import {
    limits,
    type PracticeSession,
    type SessionEntry,
} from "../../data/types";

const heartbeatMs = 10_000;

function parseBpm(value: string): number | null {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.min(limits.maxBpm, Math.max(limits.minBpm, parsed));
}

export function PracticePage() {
    const store = useAppStore();
    const { t, sessions, activities, recoveredSessionId } = store;
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const stored = sessions.find((candidate) => candidate.id === sessionId);

    // The local copy is authoritative while practising: every change is written
    // back to IndexedDB, so the store copy converges without a sync effect.
    const [local, setLocal] = useState<PracticeSession | null>(null);
    const session = local ?? stored ?? null;
    const [finishing, setFinishing] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [chordLookup, setChordLookup] = useState(false);
    const [chordSelection, setChordSelection] = useState<ChordSelection>(
        defaultChordSelection,
    );
    const [note, setNote] = useState(stored?.note ?? "");
    const [nextTimeNote, setNextTimeNote] = useState(
        stored?.nextTimeNote ?? "",
    );
    const [saved, setSaved] = useState<number | null>(null);
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionRef = useRef<PracticeSession | null>(session);

    const running = session !== null && session.runningSince !== null;
    const now = useNow(250, running);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        if (!running) {
            return;
        }
        const timer = setInterval(() => {
            const current = sessionRef.current;
            if (!current) {
                return;
            }
            const flushed = flushRunningTime(current, Date.now());
            setLocal(flushed);
            void store.saveSession(flushed);
        }, heartbeatMs);
        return () => {
            clearInterval(timer);
        };
    }, [running, store]);

    useEffect(
        () => () => {
            if (persistTimer.current !== null) {
                clearTimeout(persistTimer.current);
            }
        },
        [],
    );

    if (!session || session.status === "completed") {
        return (
            <div className="page">
                <p>{t("history.notFound")}</p>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        void navigate("/");
                    }}
                >
                    {t("error.backToToday")}
                </button>
            </div>
        );
    }

    const applyNow = (next: PracticeSession) => {
        setLocal(next);
        void store.saveSession(next);
    };

    const applyDebounced = (next: PracticeSession) => {
        setLocal(next);
        if (persistTimer.current !== null) {
            clearTimeout(persistTimer.current);
        }
        persistTimer.current = setTimeout(() => {
            void store.saveSession(next);
        }, 800);
    };

    const entry = session.entries[session.currentEntryIndex];
    const activity = entry?.activityId
        ? activities.find((candidate) => candidate.id === entry.activityId)
        : undefined;
    const previousNote = [...sessions]
        .filter(
            (candidate) =>
                candidate.status === "completed" &&
                candidate.id !== session.id &&
                candidate.entries.some(
                    (item) =>
                        item.activityId !== null &&
                        item.activityId === entry?.activityId,
                ),
        )
        .sort((left, right) =>
            right.startedAt.localeCompare(left.startedAt),
        )[0];

    const updateEntry = (patch: Partial<SessionEntry>) => {
        applyDebounced({
            ...session,
            entries: session.entries.map((candidate, index) =>
                index === session.currentEntryIndex
                    ? { ...candidate, ...patch }
                    : candidate,
            ),
        });
    };

    const goToStep = (index: number) => {
        const next = moveToEntry(session, index, Date.now());
        applyNow(next);
        const title = next.entries[index]?.activityTitleSnapshot ?? "";
        store.announce(t("practice.announceStep", { title }));
    };

    const finish = async () => {
        const finished = completeSession(
            { ...session, note, nextTimeNote },
            Date.now(),
        );
        const result = await store.finishSession(finished);
        setFinishing(false);
        if (result) {
            store.announce(t("practice.announceFinish"));
            setSaved(minutesFromMs(totalRecordedMs(result.entries)));
        }
    };

    const totalMs = sessionElapsedMs(session, now);
    const entryMs = entryElapsedMs(session, session.currentEntryIndex, now);
    const upcoming = session.entries.slice(session.currentEntryIndex + 1);

    return (
        <div className="page practice">
            <header className="practice-header">
                <div>
                    <p className="muted">
                        {session.routineNameSnapshot ??
                            t("practice.quickLabel")}
                    </p>
                    <h1>
                        {entry?.activityTitleSnapshot ?? t("practice.title")}
                    </h1>
                    <p className="muted">
                        {t("practice.step", {
                            index: session.currentEntryIndex + 1,
                            total: session.entries.length,
                        })}
                        {" · "}
                        <span
                            id="session-status"
                            className={
                                running
                                    ? "status status-run"
                                    : "status status-pause"
                            }
                        >
                            {running
                                ? t("practice.running")
                                : t("practice.paused")}
                        </span>
                    </p>
                </div>
            </header>

            {recoveredSessionId === session.id ? (
                <div className="banner banner-soft" role="status">
                    <div>
                        <strong>{t("practice.recoveredTitle")}</strong>
                        <p>{t("practice.recoveredDescription")}</p>
                    </div>
                    <button
                        type="button"
                        className="button"
                        onClick={store.acknowledgeRecovery}
                    >
                        {t("common.close")}
                    </button>
                </div>
            ) : null}

            <div className="practice-grid">
                <section className="card practice-main">
                    <p className="timer" id="session-timer">
                        {formatDuration(totalMs)}
                    </p>
                    <p className="muted">{t("practice.totalElapsed")}</p>
                    <p className="timer timer-small" id="activity-timer">
                        {formatDuration(entryMs)}
                    </p>
                    <p className="muted">
                        {t("practice.activityElapsed")}
                        {entry && entry.plannedSeconds > 0
                            ? ` · ${t("practice.planned", {
                                  minutes: Math.round(
                                      entry.plannedSeconds / 60,
                                  ),
                              })}`
                            : ""}
                    </p>

                    <div className="transport">
                        <button
                            type="button"
                            className="button"
                            disabled={session.currentEntryIndex === 0}
                            aria-label={t("practice.previous")}
                            onClick={() => {
                                goToStep(session.currentEntryIndex - 1);
                            }}
                        >
                            <Icon name="previous" />
                        </button>
                        <button
                            type="button"
                            id="toggle-session"
                            className="button button-primary button-large"
                            onClick={() => {
                                if (running) {
                                    applyNow(pauseSession(session, Date.now()));
                                    store.announce(t("practice.announcePause"));
                                } else {
                                    applyNow(
                                        resumeSession(session, Date.now()),
                                    );
                                    store.announce(
                                        t("practice.announceResume"),
                                    );
                                }
                            }}
                        >
                            <Icon name={running ? "pause" : "play"} />
                            {running
                                ? t("practice.pause")
                                : t("practice.resume")}
                        </button>
                        <button
                            type="button"
                            className="button"
                            disabled={
                                session.currentEntryIndex >=
                                session.entries.length - 1
                            }
                            aria-label={t("practice.next")}
                            onClick={() => {
                                goToStep(session.currentEntryIndex + 1);
                            }}
                        >
                            <Icon name="next" />
                        </button>
                    </div>

                    <div className="row row-wrap">
                        <button
                            type="button"
                            id="finish-session"
                            className="button button-primary"
                            onClick={() => {
                                applyNow(pauseSession(session, Date.now()));
                                setFinishing(true);
                            }}
                        >
                            <Icon name="check" />
                            {t("practice.finish")}
                        </button>
                        <button
                            type="button"
                            className="button button-danger"
                            onClick={() => {
                                setDiscarding(true);
                            }}
                        >
                            {t("practice.discard")}
                        </button>
                    </div>

                    {activity?.instructions ? (
                        <div className="panel">
                            <h2>{t("practice.instructions")}</h2>
                            <p className="quote">{activity.instructions}</p>
                        </div>
                    ) : null}

                    {previousNote?.nextTimeNote ? (
                        <div className="panel">
                            <h2>{t("practice.lastNote")}</h2>
                            <p className="quote">{previousNote.nextTimeNote}</p>
                        </div>
                    ) : null}
                </section>

                <div className="practice-side">
                    <MetronomePanel targetBpm={entry?.targetBpm ?? null} />

                    <button
                        type="button"
                        id="open-chord-lookup"
                        className="button"
                        onClick={() => {
                            setChordLookup(true);
                        }}
                    >
                        <Icon name="chords" />
                        {t("practice.chordLookup")}
                    </button>

                    <section className="card">
                        <h2>{t("common.bpm")}</h2>
                        {entry?.targetBpm ? (
                            <p className="muted">
                                {t("practice.targetBpm", {
                                    bpm: entry.targetBpm,
                                })}
                            </p>
                        ) : null}
                        <div className="field-row">
                            <div className="field field-narrow">
                                <label htmlFor="entry-start-bpm">
                                    {t("practice.startBpm")}
                                </label>
                                <input
                                    id="entry-start-bpm"
                                    type="number"
                                    inputMode="numeric"
                                    min={limits.minBpm}
                                    max={limits.maxBpm}
                                    value={entry?.startBpm ?? ""}
                                    onChange={(event) => {
                                        updateEntry({
                                            startBpm: parseBpm(
                                                event.target.value,
                                            ),
                                        });
                                    }}
                                />
                            </div>
                            <div className="field field-narrow">
                                <label htmlFor="entry-end-bpm">
                                    {t("practice.endBpm")}
                                </label>
                                <input
                                    id="entry-end-bpm"
                                    type="number"
                                    inputMode="numeric"
                                    min={limits.minBpm}
                                    max={limits.maxBpm}
                                    value={entry?.endBpm ?? ""}
                                    onChange={(event) => {
                                        updateEntry({
                                            endBpm: parseBpm(
                                                event.target.value,
                                            ),
                                        });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="entry-note">
                                {t("practice.entryNote")}
                            </label>
                            <textarea
                                id="entry-note"
                                rows={3}
                                maxLength={limits.longText}
                                value={entry?.note ?? ""}
                                onChange={(event) => {
                                    updateEntry({ note: event.target.value });
                                }}
                            />
                        </div>
                    </section>

                    {upcoming.length > 0 ? (
                        <section className="card">
                            <h2>{t("practice.upcoming")}</h2>
                            <ol className="stack-list">
                                {upcoming.map((item, index) => (
                                    <li key={item.id}>
                                        <span>
                                            {item.activityTitleSnapshot}
                                        </span>
                                        <button
                                            type="button"
                                            className="button button-quiet"
                                            onClick={() => {
                                                goToStep(
                                                    session.currentEntryIndex +
                                                        1 +
                                                        index,
                                                );
                                            }}
                                        >
                                            {t("common.start")}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ) : null}
                </div>
            </div>

            <Modal
                open={finishing}
                title={t("practice.finishTitle")}
                onClose={() => {
                    setFinishing(false);
                }}
                footer={
                    <>
                        <button
                            type="button"
                            className="button"
                            onClick={() => {
                                setFinishing(false);
                            }}
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            id="save-session"
                            className="button button-primary"
                            onClick={() => {
                                void finish();
                            }}
                        >
                            {t("practice.saveSession")}
                        </button>
                    </>
                }
            >
                <p>
                    {t("practice.finishSummary", {
                        minutes: minutesFromMs(
                            totalRecordedMs(session.entries),
                        ),
                        count: session.entries.length,
                    })}
                </p>
                <div className="field">
                    <label htmlFor="session-note">{t("practice.note")}</label>
                    <textarea
                        id="session-note"
                        rows={3}
                        maxLength={limits.longText}
                        placeholder={t("practice.notePlaceholder")}
                        value={note}
                        onChange={(event) => {
                            setNote(event.target.value);
                        }}
                    />
                </div>
                <div className="field">
                    <label htmlFor="session-next-time">
                        {t("practice.nextTime")}
                    </label>
                    <textarea
                        id="session-next-time"
                        rows={2}
                        maxLength={limits.longText}
                        placeholder={t("practice.nextTimePlaceholder")}
                        value={nextTimeNote}
                        onChange={(event) => {
                            setNextTimeNote(event.target.value);
                        }}
                    />
                </div>
            </Modal>

            <Modal
                open={saved !== null}
                title={t("practice.savedTitle")}
                onClose={() => {
                    void navigate("/");
                }}
                footer={
                    <button
                        type="button"
                        id="close-saved"
                        className="button button-primary"
                        onClick={() => {
                            void navigate("/");
                        }}
                    >
                        {t("common.close")}
                    </button>
                }
            >
                <p id="session-saved">
                    {t("practice.savedSummary", { minutes: saved ?? 0 })}
                </p>
            </Modal>

            <ConfirmDialog
                open={discarding}
                title={t("practice.discard")}
                message={t("practice.discardConfirm")}
                confirmLabel={t("practice.discard")}
                destructive
                onCancel={() => {
                    setDiscarding(false);
                }}
                onConfirm={() => {
                    void store.discardSession(session.id).then(() => {
                        void navigate("/");
                    });
                }}
            />

            <Modal
                open={chordLookup}
                title={t("chords.title")}
                onClose={() => {
                    setChordLookup(false);
                }}
                footer={
                    <button
                        type="button"
                        className="button"
                        onClick={() => {
                            setChordLookup(false);
                        }}
                    >
                        {t("common.close")}
                    </button>
                }
            >
                <ChordExplorer
                    selection={chordSelection}
                    onChange={setChordSelection}
                />
            </Modal>
        </div>
    );
}
