import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4327";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            testIgnore: /mobile\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "mobile-chromium",
            testMatch: /mobile\.spec\.ts/,
            use: { ...devices["Pixel 7"] },
        },
    ],
    webServer: {
        command: "npm run preview",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
