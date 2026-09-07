import type { BuiltInAreaKey, LanguageCode } from "../data/types";
import { ptBR, type MessageKey, type Messages } from "./pt-BR";
import { en } from "./en";

export type { MessageKey, Messages };

export const catalogues: Record<LanguageCode, Messages> = {
    "pt-BR": ptBR,
    en,
};

export const languageNames: Record<LanguageCode, string> = {
    "pt-BR": "Português (Brasil)",
    en: "English",
};

export type TranslateParams = Record<string, string | number>;

export function translate(
    catalogue: Messages,
    key: MessageKey,
    params?: TranslateParams,
): string {
    const template = catalogue[key];
    if (!params) {
        return template;
    }
    return template.replaceAll(/\{([a-z0-9]+)\}/gi, (match, token: string) => {
        const value = params[token];
        return value === undefined ? match : String(value);
    });
}

export function areaMessageKey(builtInKey: BuiltInAreaKey): MessageKey {
    return `areas.${builtInKey}` as MessageKey;
}

export function chordFamilyMessageKey(family: string): MessageKey {
    return `chords.family.${family}` as MessageKey;
}

export function chordQualityMessageKey(qualityId: string): MessageKey {
    return `chords.name.${qualityId}` as MessageKey;
}

export function detectLanguage(
    candidates: readonly string[],
): LanguageCode | null {
    for (const candidate of candidates) {
        const normalised = candidate.toLowerCase();
        if (normalised.startsWith("pt")) {
            return "pt-BR";
        }
        if (normalised.startsWith("en")) {
            return "en";
        }
    }
    return null;
}
