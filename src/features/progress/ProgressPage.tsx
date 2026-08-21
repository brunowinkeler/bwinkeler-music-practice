import { useState } from "react";
import { useAppStore } from "../../app/store";
import { formatDate, formatShortDate, formatWeekday } from "../../app/format";
import { minutesFromMs } from "../../session/timing";
import {
    addDays,
    computeWeeklyStats,
    currentStreak,
    recentActivities,
    startOfWeek,
    tempoHistory,
} from "../../stats/aggregate";

export function ProgressPage() {
    const store = useAppStore();
    const { t, settings, sessions, activities } = store;
    const [weekOffset, setWeekOffset] = useState(0);
    const [tempoActivityId, setTempoActivityId] = useState("");

    const reference = addDays(new Date(), weekOffset * 7);
    const weekStart = startOfWeek(reference, settings.weekStartsOn);
    const stats = computeWeeklyStats(sessions, weekStart);
    const maxDayMs = Math.max(...stats.days.map((day) => day.totalMs), 1);
    const recent = recentActivities(sessions, 8);
    const tempoPoints = tempoActivityId
        ? tempoHistory(sessions, tempoActivityId)
        : [];
    const streak = currentStreak(sessions, new Date());

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("progress.title")}</h1>
            </header>

            <div className="row row-wrap">
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        setWeekOffset(weekOffset - 1);
                    }}
                >
                    {t("progress.previousWeek")}
                </button>
                <button
                    type="button"
                    className="button"
                    disabled={weekOffset === 0}
                    onClick={() => {
                        setWeekOffset(0);
                    }}
                >
                    {t("progress.currentWeek")}
                </button>
                <button
                    type="button"
                    className="button"
                    disabled={weekOffset >= 0}
                    onClick={() => {
                        setWeekOffset(weekOffset + 1);
                    }}
                >
                    {t("progress.nextWeek")}
                </button>
            </div>

            <p className="muted" role="status">
                {t("progress.weekOf", {
                    start: formatDate(weekStart, settings.language),
                    end: formatDate(addDays(weekStart, 6), settings.language),
                })}
            </p>

            <section className="card summary-grid">
                <div>
                    <p className="summary-value">
                        {minutesFromMs(stats.totalMs)}
                    </p>
                    <p className="muted">{t("progress.totalMinutes")}</p>
                </div>
                <div>
                    <p className="summary-value">{stats.practiceDays}</p>
                    <p className="muted">{t("progress.practiceDays")}</p>
                </div>
                <div>
                    <p className="summary-value">{stats.sessionCount}</p>
                    <p className="muted">{t("progress.sessions")}</p>
                </div>
                <div>
                    <p className="summary-value">{streak}</p>
                    <p className="muted">{t("progress.streak")}</p>
                </div>
            </section>

            <section className="card">
                <h2>{t("progress.byDay")}</h2>
                <div className="bars" aria-hidden="true">
                    {stats.days.map((day) => (
                        <div key={day.dayKey} className="bar-column">
                            <div
                                className="bar"
                                style={{
                                    height: `${Math.round((day.totalMs / maxDayMs) * 100)}%`,
                                }}
                            />
                            <span>
                                {formatWeekday(day.date, settings.language)}
                            </span>
                        </div>
                    ))}
                </div>
                <table className="data-table">
                    <caption className="visually-hidden">
                        {t("progress.byDay")}
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">{t("progress.tableDay")}</th>
                            <th scope="col">{t("progress.tableMinutes")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.days.map((day) => (
                            <tr key={day.dayKey}>
                                <th scope="row">
                                    {formatWeekday(day.date, settings.language)}{" "}
                                    {formatShortDate(
                                        day.date,
                                        settings.language,
                                    )}
                                </th>
                                <td>{minutesFromMs(day.totalMs)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="card">
                <h2>{t("progress.byArea")}</h2>
                {stats.areas.length === 0 ? (
                    <p className="muted">{t("progress.empty")}</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th scope="col">{t("progress.tableArea")}</th>
                                <th scope="col">
                                    {t("progress.tableMinutes")}
                                </th>
                                <th scope="col">{t("progress.tableShare")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.areas.map((area) => (
                                <tr key={area.areaId + area.areaName}>
                                    <th scope="row">
                                        {store.snapshotAreaLabel(
                                            area.areaKey,
                                            area.areaName,
                                        )}
                                    </th>
                                    <td>{minutesFromMs(area.totalMs)}</td>
                                    <td>
                                        {stats.totalMs > 0
                                            ? `${Math.round((area.totalMs / stats.totalMs) * 100)}%`
                                            : "0%"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section className="card">
                <h2>{t("progress.recent")}</h2>
                {recent.length === 0 ? (
                    <p className="muted">{t("progress.empty")}</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th scope="col">
                                    {t("progress.tableActivity")}
                                </th>
                                <th scope="col">
                                    {t("progress.tableMinutes")}
                                </th>
                                <th scope="col">{t("progress.tableLast")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map((usage) => (
                                <tr key={usage.activityId ?? usage.title}>
                                    <th scope="row">{usage.title}</th>
                                    <td>{minutesFromMs(usage.totalMs)}</td>
                                    <td>
                                        {formatDate(
                                            usage.lastPractisedAt,
                                            settings.language,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section className="card">
                <h2>{t("progress.tempo")}</h2>
                <div className="field">
                    <label htmlFor="tempo-activity">
                        {t("progress.tempoSelect")}
                    </label>
                    <select
                        id="tempo-activity"
                        value={tempoActivityId}
                        onChange={(event) => {
                            setTempoActivityId(event.target.value);
                        }}
                    >
                        <option value="">{t("common.notSet")}</option>
                        {activities.map((activity) => (
                            <option key={activity.id} value={activity.id}>
                                {activity.title}
                            </option>
                        ))}
                    </select>
                </div>
                {tempoPoints.length === 0 ? (
                    <p className="muted">{t("progress.tempoEmpty")}</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th scope="col">{t("progress.tableDate")}</th>
                                <th scope="col">
                                    {t("progress.tableStartBpm")}
                                </th>
                                <th scope="col">{t("progress.tableEndBpm")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tempoPoints.map((point) => (
                                <tr key={point.date}>
                                    <th scope="row">
                                        {formatDate(
                                            point.date,
                                            settings.language,
                                        )}
                                    </th>
                                    <td>
                                        {point.startBpm ?? t("common.notSet")}
                                    </td>
                                    <td>
                                        {point.endBpm ?? t("common.notSet")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <p className="muted small">{t("progress.tempoNotice")}</p>
            </section>
        </div>
    );
}
