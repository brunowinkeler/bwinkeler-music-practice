/**
 * Verifies the production build before it is published: PWA contract, offline
 * assets, security headers, absence of third-party requests, and size budgets.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");

const totalBudgetBytes = 1024 * 1024;
const scriptGzipBudgetBytes = 250 * 1024;
// URLs that appear only inside strings (SVG namespaces, library error messages
// and URL-parsing bases). Nothing here is ever fetched at runtime; any other
// remote origin fails the check.
const allowedRemotePrefixes = [
    "http://www.w3.org/",
    "https://bit.ly/wb-",
    "https://developers.google.com/web/tools/workbox/",
    "https://react.dev/errors/",
    "https://reactrouter.com/",
    "https://github.com/ungap/url-search-params",
    "http://localhost",
    // Dexie diagnostics: "IndexedDB API missing" and "Transaction committed too early".
    "https://tinyurl.com/y2uuvskb",
    "http://bit.ly/2kdckMn",
];

const problems = [];

function fail(message) {
    problems.push(message);
}

function listFiles(directory) {
    const entries = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            entries.push(...listFiles(fullPath));
        } else {
            entries.push(fullPath);
        }
    }
    return entries;
}

function readPngSize(path) {
    const header = readFileSync(path).subarray(0, 24);
    const signature = header.subarray(0, 8).toString("hex");
    if (signature !== "89504e470d0a1a0a") {
        return null;
    }
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function requireFile(relativePath) {
    const fullPath = resolve(distDirectory, relativePath);
    try {
        statSync(fullPath);
        return fullPath;
    } catch {
        fail(`Missing build artefact: ${relativePath}`);
        return null;
    }
}

if (!requireFile("index.html")) {
    console.error("dist/index.html is missing. Run `npm run build` first.");
    process.exit(1);
}

const files = listFiles(distDirectory);

// 1. Entry document and service worker registration.
const html = readFileSync(resolve(distDirectory, "index.html"), "utf8");
if (
    !/<link[^>]+rel="manifest"[^>]+href="[^"]*manifest\.webmanifest"/.test(html)
) {
    fail("index.html does not link the web app manifest.");
}
if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(html)) {
    fail("index.html contains an inline script, which the strict CSP blocks.");
}

// 2. Web app manifest contract.
const manifestPath = requireFile("manifest.webmanifest");
if (manifestPath) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const field of [
        "name",
        "short_name",
        "start_url",
        "scope",
        "display",
        "background_color",
        "theme_color",
    ]) {
        if (!manifest[field]) {
            fail(`Manifest field is missing: ${field}`);
        }
    }
    if (manifest.display !== "standalone") {
        fail(
            `Manifest display must be "standalone", found "${manifest.display}".`,
        );
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const required = [
        { sizes: "192x192", purpose: "any" },
        { sizes: "512x512", purpose: "any" },
        { sizes: "512x512", purpose: "maskable" },
    ];
    for (const expected of required) {
        const icon = icons.find(
            (candidate) =>
                candidate.sizes === expected.sizes &&
                (candidate.purpose ?? "any")
                    .split(" ")
                    .includes(expected.purpose),
        );
        if (!icon) {
            fail(
                `Manifest is missing a ${expected.sizes} ${expected.purpose} icon.`,
            );
            continue;
        }
        const iconPath = requireFile(icon.src.replace(/^\//, ""));
        if (!iconPath) {
            continue;
        }
        const size = readPngSize(iconPath);
        const [width, height] = expected.sizes.split("x").map(Number);
        if (!size || size.width !== width || size.height !== height) {
            fail(
                `Icon ${icon.src} should be ${expected.sizes} but is ${
                    size ? `${size.width}x${size.height}` : "not a PNG"
                }.`,
            );
        }
    }
}

// 3. Offline runtime.
requireFile("sw.js");
if (!files.some((file) => /workbox-[^/\\]+\.js$/.test(file))) {
    fail("No Workbox runtime chunk was emitted.");
}
const serviceWorker = readFileSync(resolve(distDirectory, "sw.js"), "utf8");
if (!serviceWorker.includes("precache")) {
    fail("sw.js does not contain a precache manifest.");
}

// 4. Static headers and the single-page fallback.
const headersPath = requireFile("_headers");
if (headersPath) {
    const headers = readFileSync(headersPath, "utf8");
    for (const marker of [
        "Content-Security-Policy",
        "Permissions-Policy",
        "X-Content-Type-Options",
        "immutable",
    ]) {
        if (!headers.includes(marker)) {
            fail(`_headers is missing "${marker}".`);
        }
    }
    for (const forbidden of ["unsafe-inline", "unsafe-eval"]) {
        if (headers.includes(forbidden)) {
            fail(`_headers weakens the policy with "${forbidden}".`);
        }
    }
}
const redirectsPath = requireFile("_redirects");
if (redirectsPath) {
    const redirects = readFileSync(redirectsPath, "utf8");
    if (!redirects.includes("/index.html")) {
        fail("_redirects does not provide the single-page fallback.");
    }
}

// 5. No third-party requests and no leaked source maps.
for (const file of files) {
    const extension = extname(file);
    if (![".html", ".js", ".css", ".webmanifest"].includes(extension)) {
        continue;
    }
    const contents = readFileSync(file, "utf8");
    for (const match of contents.matchAll(/https?:\/\/[^"'`\s)]+/g)) {
        const url = match[0];
        if (!allowedRemotePrefixes.some((prefix) => url.startsWith(prefix))) {
            fail(
                `${relative(distDirectory, file)} references a remote URL: ${url}`,
            );
        }
    }
}
if (files.some((file) => file.endsWith(".map"))) {
    fail("Source maps must not be published.");
}

// 6. Size budgets. Scripts are measured compressed, the way they are served.
let totalBytes = 0;
for (const file of files) {
    const { size } = statSync(file);
    totalBytes += size;
    if (extname(file) !== ".js") {
        continue;
    }
    const gzipBytes = gzipSync(readFileSync(file)).length;
    if (gzipBytes > scriptGzipBudgetBytes) {
        fail(
            `${relative(distDirectory, file)} is ${Math.round(gzipBytes / 1024)} KB gzipped, above the ${
                scriptGzipBudgetBytes / 1024
            } KB script budget.`,
        );
    }
}
if (totalBytes > totalBudgetBytes) {
    fail(
        `dist is ${Math.round(totalBytes / 1024)} KB, above the ${
            totalBudgetBytes / 1024
        } KB budget.`,
    );
}

if (problems.length > 0) {
    console.error("Artefact check failed:");
    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }
    process.exit(1);
}

console.log(
    `Artefact check passed: ${files.length} files, ${Math.round(totalBytes / 1024)} KB total.`,
);
