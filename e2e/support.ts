import { expect, type Page } from "@playwright/test";

/** Completes the first-run dialog so a spec can start from a known state. */
export async function completeOnboarding(
    page: Page,
    options: { starterRoutine?: boolean } = {},
): Promise<void> {
    const dialog = page.getByRole("dialog", { name: /Practice Companion/i });
    await expect(dialog).toBeVisible();
    await dialog
        .getByRole("button", {
            name:
                options.starterRoutine === false
                    ? /empty|vazio/i
                    : /rotina inicial|starter routine/i,
        })
        .click();
    await expect(dialog).toBeHidden();
}

export async function openApp(
    page: Page,
    options: { starterRoutine?: boolean } = {},
): Promise<void> {
    await page.goto("/");
    await completeOnboarding(page, options);
}

export async function switchToEnglish(page: Page): Promise<void> {
    await page.goto("/settings");
    await page.getByLabel(/idioma|language/i).selectOption("en");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function startStarterRoutine(page: Page): Promise<void> {
    await page.goto("/");
    await page.locator("#start-last-routine").click();
    await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/);
}

export async function finishSession(page: Page, note = ""): Promise<void> {
    await page.locator("#finish-session").click();
    if (note) {
        await page.locator("#session-note").fill(note);
    }
    await page.locator("#save-session").click();
    await expect(page.locator("#session-saved")).toBeVisible();
    await page.locator("#close-saved").click();
    await expect(page).toHaveURL("/");
}
