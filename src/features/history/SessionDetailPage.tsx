import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAppStore } from "../../app/store";
import { ConfirmDialog } from "../../components/Modal";
import { formatDate, formatTime } from "../../app/format";
import { minutesFromMs } from "../../session/timing";
import { limits, type SessionEntry } from "../../data/types";

export function SessionDetailPage() {
    const store = useAppStore();
    const { t, settings, sessions } = store;
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const session = sessions.find((candidate) => candidate.id === sessionId);

    const [note, setNote] = useState(session?.note ?? "");
    const [nextTimeNote, setNextTimeNote] = useState(
        session?.nextTimeNote ?? "",
    );
    const [entries, setEntries] = useState<SessionEntry[]>(
        session?.entries ?? [],
    );
    const [deleting, setDeleting] = useState(false);

    if (!session) {
        return (
            <div className="page">
                <p>{t("history.notFound")}</p>
            </div>
        );
    }

    const updateEntry = (id: string, patch: Partial<SessionEntry>) => {
        setEntries(
            entries.map((entry) =>
                entry.id === id ? { ...entry, ...patch } : entry,
            ),
        );
    };

    const save = () => {
        void store
            .saveSession({ ...session, note, nextTimeNote, entries })
            .then(() => {
                store.announce(t("history.saved"));
                void navigate("/history");
            });
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>
                    {t("history.detailTitle", {
                        date: `${formatDate(session.startedAt, settings.language)} ${formatTime(session.startedAt, settings.language)}`,
                    })}
                </h1>
            </header>

            <p className="muted">
                {session.routineNameSnapshot ?? t("practice.quickLabel")}
            </p>

            <ul className="card-list">
                {entries.map((entry) => (
                    <li key={entry.id} className="card">
                        <h2>{entry.activityTitleSnapshot}</h2>
                        <p className="muted">
                            {store.snapshotAreaLabel(
                                entry.practiceAreaKeySnapshot,
                                entry.practiceAreaNameSnapshot,
                            )}
                        </p>
                        <div className="field-row">
                            <div className="field field-narrow">
                                <label htmlFor={`minutes-${entry.id}`}>
                                    {t("history.entryMinutes")}
                                </label>
                                <input
                                    id={`minutes-${entry.id}`}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={1440}
                                    value={minutesFromMs(entry.activeMs)}
                                    onChange={(event) => {
                                        const minutes = Math.max(
                                            0,
                                            Math.min(
                                                1440,
                                                Number.parseInt(
                                                    event.target.value,
                                                    10,
                                                ) || 0,
                                            ),
                                        );
                                        updateEntry(entry.id, {
                                            activeMs: minutes * 60_000,
                                        });
                                    }}
                                />
                            </div>
                            <div className="field field-narrow">
                                <label htmlFor={`start-bpm-${entry.id}`}>
                                    {t("practice.startBpm")}
                                </label>
                                <input
                                    id={`start-bpm-${entry.id}`}
                                    type="number"
                                    inputMode="numeric"
                                    min={limits.minBpm}
                                    max={limits.maxBpm}
                                    value={entry.startBpm ?? ""}
                                    onChange={(event) => {
                                        const parsed = Number.parseInt(
                                            event.target.value,
                                            10,
                                        );
                                        updateEntry(entry.id, {
                                            startBpm: Number.isFinite(parsed)
                                                ? parsed
                                                : null,
                                        });
                                    }}
                                />
                            </div>
                            <div className="field field-narrow">
                                <label htmlFor={`end-bpm-${entry.id}`}>
                                    {t("practice.endBpm")}
                                </label>
                                <input
                                    id={`end-bpm-${entry.id}`}
                                    type="number"
                                    inputMode="numeric"
                                    min={limits.minBpm}
                                    max={limits.maxBpm}
                                    value={entry.endBpm ?? ""}
                                    onChange={(event) => {
                                        const parsed = Number.parseInt(
                                            event.target.value,
                                            10,
                                        );
                                        updateEntry(entry.id, {
                                            endBpm: Number.isFinite(parsed)
                                                ? parsed
                                                : null,
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            <div className="field">
                <label htmlFor="detail-note">{t("practice.note")}</label>
                <textarea
                    id="detail-note"
                    rows={3}
                    maxLength={limits.longText}
                    value={note}
                    onChange={(event) => {
                        setNote(event.target.value);
                    }}
                />
            </div>
            <div className="field">
                <label htmlFor="detail-next-time">
                    {t("practice.nextTime")}
                </label>
                <textarea
                    id="detail-next-time"
                    rows={2}
                    maxLength={limits.longText}
                    value={nextTimeNote}
                    onChange={(event) => {
                        setNextTimeNote(event.target.value);
                    }}
                />
            </div>

            <div className="row row-wrap">
                <button
                    type="button"
                    className="button button-primary"
                    onClick={save}
                >
                    {t("common.save")}
                </button>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        void navigate("/history");
                    }}
                >
                    {t("common.cancel")}
                </button>
                <button
                    type="button"
                    className="button button-danger"
                    onClick={() => {
                        setDeleting(true);
                    }}
                >
                    {t("common.delete")}
                </button>
            </div>

            <ConfirmDialog
                open={deleting}
                title={t("common.delete")}
                message={t("history.deleteConfirm")}
                confirmLabel={t("common.delete")}
                destructive
                onCancel={() => {
                    setDeleting(false);
                }}
                onConfirm={() => {
                    void store.deleteSession(session.id).then(() => {
                        void navigate("/history");
                    });
                }}
            />
        </div>
    );
}
