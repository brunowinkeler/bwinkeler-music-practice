import type { LanguageCode, ThemePreference } from "../data/types";
import { detectLanguage } from "../i18n";

/**
 * Language and theme are mirrored in `localStorage` purely so the first paint
 * is already correct. IndexedDB stays the single source of truth.
 */

const storageKey = "practice-companion:appearance";

interface StoredAppearance {
    language: LanguageCode;
    theme: ThemePreference;
}

export function readStoredAppearance(): StoredAppearance | null {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) {
            return null;
        }
        const { language, theme } = parsed as Partial<StoredAppearance>;
        if (
            (language !== "pt-BR" && language !== "en") ||
            (theme !== "light" && theme !== "dark" && theme !== "system")
        ) {
            return null;
        }
        return { language, theme };
    } catch {
        return null;
    }
}

export function storeAppearance(
    language: LanguageCode,
    theme: ThemePreference,
): void {
    try {
        localStorage.setItem(storageKey, JSON.stringify({ language, theme }));
    } catch {
        // Private-browsing modes may refuse the write; appearance is not data.
    }
}

export function applyAppearance(
    language: LanguageCode,
    theme: ThemePreference,
): void {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "system" ? "light dark" : theme;
}

/** Called before React mounts so the shell never flashes the wrong theme. */
export function applyStoredAppearance(): void {
    const stored = readStoredAppearance();
    const language =
        stored?.language ??
        detectLanguage(navigator.languages ?? []) ??
        "pt-BR";
    applyAppearance(language, stored?.theme ?? "system");
}
