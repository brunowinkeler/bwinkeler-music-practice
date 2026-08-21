import { expect, test } from "@playwright/test";
import { finishSession, openApp, startStarterRoutine } from "./support";

test.describe("practice loop", () => {
    test("first run creates a routine and saves a session", async ({
        page,
    }) => {
        await openApp(page);

        await expect(page.getByText("Rotina inicial")).toBeVisible();
        await expect(page.getByText("4 atividades")).toBeVisible();

        await startStarterRoutine(page);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            "Aquecimento",
        );
        await expect(page.getByText("Atividade 1 de 4")).toBeVisible();

        await finishSession(page, "Primeira sessão");

        await page.goto("/history");
        await expect(page.getByText("Primeira sessão")).toBeVisible();
        await expect(page.getByText("1 sessão(ões)")).toBeVisible();
    });

    test("pause holds the timer and resume continues it", async ({ page }) => {
        await openApp(page);
        await startStarterRoutine(page);

        await page.waitForTimeout(1500);
        await page.locator("#toggle-session").click();
        await expect(page.locator("#session-status")).toHaveText("Pausada");

        const paused = await page.locator("#session-timer").innerText();
        await page.waitForTimeout(1500);
        expect(await page.locator("#session-timer").innerText()).toBe(paused);

        await page.locator("#toggle-session").click();
        await expect(page.locator("#session-status")).toHaveText(
            "Em andamento",
        );
        await page.waitForTimeout(1500);
        expect(await page.locator("#session-timer").innerText()).not.toBe(
            paused,
        );
    });

    test("a reload recovers the draft as a paused session", async ({
        page,
    }) => {
        await openApp(page);
        await startStarterRoutine(page);
        const url = page.url();

        // The heartbeat persists elapsed time; wait for one before reloading.
        await page.waitForTimeout(11_000);
        await page.reload();

        await expect(page.getByText("Sessão recuperada")).toBeVisible();
        await expect(page.locator("#session-status")).toHaveText("Pausada");
        expect(page.url()).toBe(url);
        await expect(page.locator("#session-timer")).not.toHaveText("00:00");

        await finishSession(page);
        await page.goto("/progress");
        await expect(page.getByText("Sessões")).toBeVisible();
    });

    test("moving to the next activity keeps per-activity time", async ({
        page,
    }) => {
        await openApp(page);
        await startStarterRoutine(page);

        await page.waitForTimeout(1200);
        await page.getByRole("button", { name: "Próxima atividade" }).click();
        await expect(page.getByText("Atividade 2 de 4")).toBeVisible();
        await expect(page.locator("#activity-timer")).toHaveText("00:00");
        await expect(page.locator("#session-timer")).not.toHaveText("00:00");
    });

    test("quick practice records a session without a routine", async ({
        page,
    }) => {
        await openApp(page);
        await page.locator("#start-quick-practice").click();
        await page.locator("#quick-start").click();
        await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/);
        await expect(page.getByText("Estudo rápido")).toBeVisible();

        await finishSession(page);
        await page.goto("/history");
        await expect(page.getByText("Estudo rápido")).toBeVisible();
    });

    test("discarding a session leaves history untouched", async ({ page }) => {
        await openApp(page);
        await startStarterRoutine(page);

        await page.getByRole("button", { name: "Descartar" }).click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Descartar" })
            .click();

        await expect(page).toHaveURL("/");
        await page.goto("/history");
        await expect(page.getByText("Nenhuma sessão registrada")).toBeVisible();
    });

    test("the metronome starts and shows a visual beat", async ({ page }) => {
        await openApp(page);
        await startStarterRoutine(page);

        await page.locator("#metronome-toggle").click();
        await expect(
            page.getByRole("button", { name: "Desligar metrônomo" }),
        ).toBeVisible();
        await expect(page.locator(".beat-active")).toHaveCount(1, {
            timeout: 5000,
        });

        await page.locator("#metronome-toggle").click();
        await expect(
            page.getByRole("button", { name: "Ligar metrônomo" }),
        ).toBeVisible();
    });
});

test.describe("routines and activities", () => {
    test("a routine can be built, reordered, and practised", async ({
        page,
    }) => {
        await openApp(page);
        await page.goto("/routines/new");
        await page.locator("#routine-name").fill("Rotina de teste");

        await page.getByRole("button", { name: "Adicionar atividade" }).click();
        await page.getByRole("button", { name: "Adicionar atividade" }).click();

        const firstSelect = page.locator("select[id^='step-activity']").first();
        await firstSelect.selectOption({ label: "Escalas ou acordes" });
        const movedValue = await firstSelect.inputValue();

        await page
            .getByRole("button", { name: "Mover para baixo" })
            .first()
            .click();
        await expect(
            page.locator("select[id^='step-activity']").nth(1),
        ).toHaveValue(movedValue);

        await page.getByRole("button", { name: "Salvar e praticar" }).click();
        await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/);
        await expect(page.getByText("Atividade 1 de 2")).toBeVisible();
    });

    test("an archived activity leaves the picker but keeps history", async ({
        page,
    }) => {
        await openApp(page);
        await startStarterRoutine(page);
        await finishSession(page);

        await page.goto("/routines?tab=activities");
        const card = page
            .getByRole("listitem")
            .filter({ hasText: "Aquecimento" });
        await card.getByRole("button", { name: "Arquivar" }).click();
        await expect(card).toHaveCount(0);

        await page.goto("/history");
        await expect(
            page.getByRole("listitem").filter({ hasText: "Aquecimento" }),
        ).toHaveCount(1);
    });
});
