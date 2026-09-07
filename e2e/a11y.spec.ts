import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openApp, startStarterRoutine } from "./support";

const pages = [
    "/",
    "/routines",
    "/chords",
    "/history",
    "/progress",
    "/settings",
];

test.describe("accessibility", () => {
    for (const path of pages) {
        test(`has no critical automated finding on ${path}`, async ({
            page,
        }) => {
            await openApp(page);
            await page.goto(path);
            const results = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
            expect(results.violations).toEqual([]);
        });
    }

    test("the practice view passes the same checks", async ({ page }) => {
        await openApp(page);
        await startStarterRoutine(page);
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
        expect(results.violations).toEqual([]);
    });

    test("a session can be run with the keyboard only", async ({ page }) => {
        await openApp(page);
        await page.goto("/");

        await page.locator("#start-last-routine").focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/);

        await page.locator("#toggle-session").focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#session-status")).toHaveText("Pausada");

        await page.locator("#finish-session").focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
    });

    test("charts expose an equivalent data table", async ({ page }) => {
        await openApp(page);
        await page.goto("/progress");
        const table = page.getByRole("table").first();
        await expect(table).toBeVisible();
        await expect(table.getByRole("columnheader").first()).toHaveText("Dia");
    });

    test("core content fits a 320 pixel viewport", async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 720 });
        await openApp(page);
        const overflow = await page.evaluate(
            () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
        );
        expect(overflow).toBe(false);
    });
});
