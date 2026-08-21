import { expect, test } from "@playwright/test";
import { finishSession, openApp, startStarterRoutine } from "./support";

test.describe("phone layout", () => {
    test("shows the bottom navigation and hides it during a session", async ({
        page,
    }) => {
        await openApp(page);
        const navigation = page.getByRole("navigation", {
            name: "Seções principais",
        });
        await expect(navigation).toBeVisible();

        await startStarterRoutine(page);
        await expect(navigation).toBeHidden();

        await finishSession(page);
        await expect(navigation).toBeVisible();
    });

    test("keeps the session controls reachable without horizontal scrolling", async ({
        page,
    }) => {
        await openApp(page);
        await startStarterRoutine(page);

        await expect(page.locator("#toggle-session")).toBeVisible();
        const overflow = await page.evaluate(
            () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
        );
        expect(overflow).toBe(false);

        const box = await page.locator("#toggle-session").boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
});
