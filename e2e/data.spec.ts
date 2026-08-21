import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
    completeOnboarding,
    finishSession,
    openApp,
    startStarterRoutine,
} from "./support";

function writeFixture(
    testInfo: import("@playwright/test").TestInfo,
    name: string,
    contents: string,
): string {
    mkdirSync(testInfo.outputDir, { recursive: true });
    const file = join(testInfo.outputDir, name);
    writeFileSync(file, contents);
    return file;
}

async function exportBackup(page: import("@playwright/test").Page) {
    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#export-backup").click(),
    ]);
    const path = await download.path();
    expect(download.suggestedFilename()).toMatch(
        /^practice-companion-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );
    return readFileSync(path, "utf8");
}

test.describe("backup and export", () => {
    test("a backup restores an equivalent state after deleting everything", async ({
        page,
    }, testInfo) => {
        await openApp(page);
        await startStarterRoutine(page);
        await finishSession(page, "Sessão para backup");

        await page.goto("/settings");
        const backup = await exportBackup(page);
        expect(JSON.parse(backup).format).toBe("bwinkeler-practice-backup");

        await page.locator("#delete-all").click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Apagar todos os dados" })
            .click();

        // Deleting everything also removes the settings, so the app returns to
        // its first run.
        await completeOnboarding(page, { starterRoutine: false });

        await page.goto("/history");
        await expect(page.getByText("Nenhuma sessão registrada")).toBeVisible();

        const file = writeFixture(testInfo, "backup.json", backup);

        await page.goto("/settings");
        await page.locator("#open-restore").click();
        await page.locator("#restore-file").setInputFiles(file);
        await expect(page.locator("#restore-counts")).toContainText(
            "1 sessões",
        );
        await page.locator("#confirm-restore").click();

        await page.goto("/history");
        await expect(page.getByText("Sessão para backup")).toBeVisible();
        await page.goto("/routines");
        await expect(page.getByText("Rotina inicial")).toBeVisible();
    });

    test("a malformed backup is rejected without changing data", async ({
        page,
    }, testInfo) => {
        await openApp(page);

        const file = writeFixture(
            testInfo,
            "broken.json",
            "{ definitely not json",
        );

        await page.goto("/settings");
        await page.locator("#open-restore").click();
        await page.locator("#restore-file").setInputFiles(file);

        await expect(page.getByRole("alert")).toContainText("JSON");
        await expect(page.locator("#confirm-restore")).toBeDisabled();

        await page.goto("/routines");
        await expect(page.getByText("Rotina inicial")).toBeVisible();
    });

    test("a backup from a newer schema is refused", async ({
        page,
    }, testInfo) => {
        await openApp(page);
        await page.goto("/settings");
        const backup = JSON.parse(await exportBackup(page)) as {
            schemaVersion: number;
            checksum?: string;
        };
        backup.schemaVersion = 99;
        delete backup.checksum;

        const file = writeFixture(
            testInfo,
            "future.json",
            JSON.stringify(backup),
        );

        await page.locator("#open-restore").click();
        await page.locator("#restore-file").setInputFiles(file);
        await expect(page.getByRole("alert")).toContainText("versão mais nova");
    });

    test("the CSV export neutralises spreadsheet formulas", async ({
        page,
    }) => {
        await openApp(page);
        await startStarterRoutine(page);
        await finishSession(page, "=1+1");

        await page.goto("/settings");
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            page.locator("#export-csv").click(),
        ]);
        const csv = readFileSync(await download.path(), "utf8");
        expect(csv.split("\r\n")[0]).toContain("session_id,date,start_time");
        expect(csv).toContain(`"'=1+1"`);
    });
});
