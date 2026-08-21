import { describe, expect, it } from "vitest";
import { catalogues, detectLanguage, translate } from "../src/i18n";
import { ptBR } from "../src/i18n/pt-BR";
import { en } from "../src/i18n/en";
import { builtInAreaKeys } from "../src/data/types";

describe("localisation", () => {
    it("keeps both catalogues on the same key set", () => {
        const source = Object.keys(ptBR).sort();
        const target = Object.keys(en).sort();
        expect(target).toEqual(source);
    });

    it("has no empty translation", () => {
        for (const [language, catalogue] of Object.entries(catalogues)) {
            for (const [key, value] of Object.entries(catalogue)) {
                expect(value.trim(), `${language}:${key}`).not.toBe("");
            }
        }
    });

    it("uses the same placeholders in every language", () => {
        const placeholders = (value: string) =>
            [...value.matchAll(/\{([a-z0-9]+)\}/gi)]
                .map((match) => match[1])
                .sort();
        for (const key of Object.keys(ptBR) as (keyof typeof ptBR)[]) {
            expect(placeholders(en[key]), key).toEqual(placeholders(ptBR[key]));
        }
    });

    it("labels every built-in practice area", () => {
        for (const key of builtInAreaKeys) {
            expect(ptBR[`areas.${key}` as keyof typeof ptBR]).toBeTruthy();
        }
    });

    it("replaces placeholders and leaves unknown tokens untouched", () => {
        expect(translate(en, "goals.minutes", { done: 30, target: 150 })).toBe(
            "30 of 150 min",
        );
        expect(translate(en, "goals.minutes")).toBe("{done} of {target} min");
        expect(translate(en, "goals.minutes", { done: 30 })).toBe(
            "30 of {target} min",
        );
    });

    it("detects a supported language from browser preferences", () => {
        expect(detectLanguage(["pt-BR", "en-US"])).toBe("pt-BR");
        expect(detectLanguage(["en-GB"])).toBe("en");
        expect(detectLanguage(["de-DE"])).toBeNull();
    });
});
