import type { LanguageCode } from "../data/types";

export function formatDate(
    value: string | Date,
    language: LanguageCode,
): string {
    return new Intl.DateTimeFormat(language, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function formatShortDate(
    value: string | Date,
    language: LanguageCode,
): string {
    return new Intl.DateTimeFormat(language, {
        day: "2-digit",
        month: "2-digit",
    }).format(new Date(value));
}

export function formatTime(
    value: string | Date,
    language: LanguageCode,
): string {
    return new Intl.DateTimeFormat(language, {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function formatWeekday(
    value: string | Date,
    language: LanguageCode,
): string {
    return new Intl.DateTimeFormat(language, { weekday: "short" }).format(
        new Date(value),
    );
}

export function daysBetween(from: string, to: number): number {
    const start = Date.parse(from);
    if (!Number.isFinite(start)) {
        return Number.POSITIVE_INFINITY;
    }
    return Math.floor((to - start) / 86_400_000);
}

/** `YYYY-MM-DD` for `<input type="date">`, in local time. */
export function toDateInputValue(value: Date): string {
    return [
        value.getFullYear(),
        `${value.getMonth() + 1}`.padStart(2, "0"),
        `${value.getDate()}`.padStart(2, "0"),
    ].join("-");
}
