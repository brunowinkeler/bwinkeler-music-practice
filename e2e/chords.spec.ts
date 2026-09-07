import { expect, test } from "@playwright/test";
import { openApp, startStarterRoutine } from "./support";

test.describe("chord dictionary", () => {
    test("shows the tones of the selected chord", async ({ page }) => {
        await openApp(page);
        await page.goto("/chords");

        await expect(page.locator("#chord-symbol")).toHaveText("C");
        await expect(page.locator("#chord-tones")).toContainText("E");

        await page.locator("#chord-root").selectOption("Bb");
        await page.locator("#chord-quality").selectOption("min7");

        await expect(page.locator("#chord-symbol")).toHaveText("Bbm7");
        await expect(page.locator("#chord-tones")).toContainText("Db");
        await expect(page.locator("#chord-tones")).toContainText("Ab");
        await expect(page.locator(".piano-diagram")).toBeVisible();
    });

    test("keeps the chord in the address bar", async ({ page }) => {
        await openApp(page);
        await page.goto("/chords");
        await page.locator("#chord-root").selectOption("F#");
        await page.locator("#chord-quality").selectOption("min7b5");

        await expect(page).toHaveURL(/root=F%23&quality=min7b5/);
        await page.reload();
        await expect(page.locator("#chord-symbol")).toHaveText("F#m7b5");
    });

    test("jumps to a chord typed as a symbol", async ({ page }) => {
        await openApp(page);
        await page.goto("/chords");

        await page.locator("#chord-search").fill("G7");
        await expect(page.locator("#chord-symbol")).toHaveText("G7");

        await page.locator("#chord-search").fill("not a chord");
        await expect(page.locator("#chord-search-hint")).toHaveText(
            "Não reconheci essa cifra.",
        );
        await expect(page.locator("#chord-symbol")).toHaveText("G7");
    });

    test("draws playable guitar shapes with a text equivalent", async ({
        page,
    }) => {
        await openApp(page);
        await page.goto("/chords");
        await page.getByRole("tab", { name: "Violão" }).click();

        const panel = page.locator("#panel-guitar");
        await expect(panel.locator(".chord-shape").first()).toBeVisible();
        await expect(panel).toContainText("× 3 2 0 1 0");
        await expect(panel.getByRole("img").first()).toHaveAttribute(
            "aria-label",
            /C/,
        );
    });

    test("creates a practice activity from a chord", async ({ page }) => {
        await openApp(page);
        await page.goto("/chords?root=A&quality=min7&instrument=guitar");
        await page.locator("#create-chord-activity").click();

        await expect(page).toHaveURL(/\/activities\/[0-9a-f-]+$/);
        await expect(page.getByLabel("Título")).toHaveValue(
            "Acorde Am7 — Violão",
        );
    });

    test("is reachable during a session without leaving it", async ({
        page,
    }) => {
        await openApp(page);
        await startStarterRoutine(page);

        await page.locator("#open-chord-lookup").click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await dialog.locator("#chord-search").fill("Em");
        await expect(dialog.locator("#chord-symbol")).toHaveText("Em");

        await dialog.getByRole("button", { name: "Fechar" }).click();
        await expect(dialog).toBeHidden();
        await expect(page.locator("#toggle-session")).toBeVisible();
    });
});
