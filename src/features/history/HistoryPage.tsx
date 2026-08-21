import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../app/store";
import { formatDate, formatTime } from "../../app/format";
import { minutesFromMs, totalRecordedMs } from "../../session/timing";
import { localDayKey } from "../../stats/aggregate";

export function HistoryPage() {
    const store = useAppStore();
    const { t, settings, sessions, activities } = store;
    const navigate = useNavigate();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [activityId, setActivityId] = useState("");

    const completed = sessions
        .filter((session) => session.status === "completed")
        .filter((session) => {
            const dayKey = localDayKey(new Date(session.startedAt));
            if (from && dayKey < from) {
                return false;
            }
            if (to && dayKey > to) {
                return false;
            }
            if (
                activityId &&
                !session.entries.some(
                    (entry) => entry.activityId === activityId,
                )
            ) {
                return false;
            }
            return true;
        })
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("history.title")}</h1>
            </header>

            <section className="card">
                <div className="field-row">
                    <div className="field">
                        <label htmlFor="history-from">
                            {t("history.filterFrom")}
                        </label>
                        <input
                            id="history-from"
                            type="date"
                            value={from}
                            onChange={(event) => {
                                setFrom(event.target.value);
                            }}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="history-to">
                            {t("history.filterTo")}
                        </label>
                        <input
                            id="history-to"
                            type="date"
                            value={to}
                            onChange={(event) => {
                                setTo(event.target.value);
                            }}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="history-activity">
                            {t("history.filterActivity")}
                        </label>
                        <select
                            id="history-activity"
                            value={activityId}
                            onChange={(event) => {
                                setActivityId(event.target.value);
                            }}
                        >
                            <option value="">{t("history.filterAll")}</option>
                            {activities.map((activity) => (
                                <option key={activity.id} value={activity.id}>
                                    {activity.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        setFrom("");
                        setTo("");
                        setActivityId("");
                    }}
                >
                    {t("history.clearFilters")}
                </button>
            </section>

            <p className="muted" role="status">
                {t("history.results", { count: completed.length })}
            </p>

            {completed.length === 0 ? (
                <section className="card">
                    <h2>{t("history.emptyTitle")}</h2>
                    <p>{t("history.emptyDescription")}</p>
                </section>
            ) : (
                <ul className="card-list">
                    {completed.map((session) => (
                        <li key={session.id} className="card">
                            <div className="card-head">
                                <h2>
                                    {formatDate(
                                        session.startedAt,
                                        settings.language,
                                    )}{" "}
                                    ·{" "}
                                    {formatTime(
                                        session.startedAt,
                                        settings.language,
                                    )}
                                </h2>
                                <span className="badge">
                                    {t("history.durationCell", {
                                        minutes: minutesFromMs(
                                            totalRecordedMs(session.entries),
                                        ),
                                    })}
                                </span>
                            </div>
                            <p className="muted">
                                {session.routineNameSnapshot ??
                                    t("practice.quickLabel")}
                            </p>
                            <p>
                                {session.entries
                                    .map(
                                        (entry) =>
                                            `${entry.activityTitleSnapshot} (${minutesFromMs(entry.activeMs)} ${t("common.minutesShort")})`,
                                    )
                                    .join(" · ")}
                            </p>
                            {session.note ? (
                                <p className="quote">{session.note}</p>
                            ) : null}
                            <button
                                type="button"
                                className="button"
                                onClick={() => {
                                    void navigate(`/history/${session.id}`);
                                }}
                            >
                                {t("common.edit")}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
