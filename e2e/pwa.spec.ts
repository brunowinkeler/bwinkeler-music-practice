import { expect, test } from "@playwright/test";
import { openApp, startStarterRoutine } from "./support";

test.describe("installable and offline", () => {
    test("serves a manifest and registers a service worker", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const manifestHref = await page
            .locator("link[rel='manifest']")
            .getAttribute("href");
        expect(manifestHref).toBeTruthy();

        const manifest = await (
            await request.get(manifestHref as string)
        ).json();
        expect(manifest.name).toBe("Practice Companion");
        expect(manifest.display).toBe("standalone");
        expect(manifest.start_url).toBe("/");

        await page.waitForFunction(
            async () => {
                await navigator.serviceWorker.ready;
                return true;
            },
            undefined,
            { timeout: 20_000 },
        );
    });

    test("keeps working after an offline reload", async ({ page, context }) => {
        await openApp(page);
        await page.waitForFunction(
            async () => {
                await navigator.serviceWorker.ready;
                return true;
            },
            undefined,
            { timeout: 20_000 },
        );
        // The worker does not claim open clients, so one reload puts the page
        // under its control before the network is cut.
        await page.reload();
        await page.waitForFunction(
            () => navigator.serviceWorker.controller !== null,
            undefined,
            { timeout: 20_000 },
        );

        await startStarterRoutine(page);

        await context.setOffline(true);
        await page.reload();

        await expect(page.getByText("Sessão recuperada")).toBeVisible();
        await page.locator("#toggle-session").click();
        await expect(page.locator("#session-status")).toHaveText(
            "Em andamento",
        );

        await page.goto("/progress");
        await expect(
            page.getByRole("heading", { name: "Progresso" }),
        ).toBeVisible();
        await context.setOffline(false);
    });

    test("loads a deep route directly", async ({ page }) => {
        await openApp(page);
        await page.goto("/settings");
        await expect(
            page.getByRole("heading", { name: "Ajustes" }),
        ).toBeVisible();
        await page.goto("/does-not-exist");
        await expect(page.getByText("Página não encontrada")).toBeVisible();
    });

    test("makes no third-party request", async ({ page }) => {
        const external: string[] = [];
        page.on("request", (request) => {
            if (!request.url().startsWith("http://127.0.0.1:4327")) {
                external.push(request.url());
            }
        });
        await openApp(page);
        await startStarterRoutine(page);
        expect(external).toEqual([]);
    });
});
