/**
 * Hand-written validators for untrusted input (imported backups and forms).
 * They are deliberately explicit: a backup file is attacker-controlled data, so
 * every field is checked before a single record reaches the database.
 */

export type ValidationCode =
    | "tooLarge"
    | "invalidJson"
    | "unsupportedFormat"
    | "unsupportedVersion"
    | "checksumMismatch"
    | "invalidRecord";

export class ValidationError extends Error {
    readonly code: ValidationCode;
    readonly path: string;

    constructor(code: ValidationCode, path: string, message?: string) {
        super(message ?? `${code} at ${path || "<root>"}`);
        this.name = "ValidationError";
        this.code = code;
        this.path = path;
    }
}

/** Keys that would let imported data reach `Object.prototype`. */
export const forbiddenKeys = ["__proto__", "prototype", "constructor"];

function fail(path: string, message: string): never {
    throw new ValidationError("invalidRecord", path, message);
}

export function asObject(
    value: unknown,
    path: string,
): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail(path, "expected an object");
    }
    for (const key of Object.keys(value as object)) {
        if (forbiddenKeys.includes(key)) {
            fail(path, `forbidden key: ${key}`);
        }
    }
    return value as Record<string, unknown>;
}

export function asArray(
    value: unknown,
    path: string,
    maxLength: number,
): unknown[] {
    if (!Array.isArray(value)) {
        fail(path, "expected an array");
    }
    if (value.length > maxLength) {
        fail(path, `more than ${maxLength} items`);
    }
    return value;
}

export function asString(
    value: unknown,
    path: string,
    maxLength: number,
): string {
    if (typeof value !== "string") {
        fail(path, "expected a string");
    }
    if ([...value].length > maxLength) {
        fail(path, `longer than ${maxLength} characters`);
    }
    return value;
}

export function asId(value: unknown, path: string): string {
    const id = asString(value, path, 100);
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
        fail(path, "expected an identifier");
    }
    return id;
}

export function asBoolean(value: unknown, path: string): boolean {
    if (typeof value !== "boolean") {
        fail(path, "expected a boolean");
    }
    return value;
}

export function asInteger(
    value: unknown,
    path: string,
    min: number,
    max: number,
): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(path, "expected a number");
    }
    const rounded = Math.round(value);
    if (rounded < min || rounded > max) {
        fail(path, `outside ${min}..${max}`);
    }
    return rounded;
}

export function asNullableInteger(
    value: unknown,
    path: string,
    min: number,
    max: number,
): number | null {
    if (value === null || value === undefined) {
        return null;
    }
    return asInteger(value, path, min, max);
}

export function asIsoDate(value: unknown, path: string): string {
    const text = asString(value, path, 40);
    const parsed = Date.parse(text);
    if (!Number.isFinite(parsed)) {
        fail(path, "expected an ISO 8601 instant");
    }
    return new Date(parsed).toISOString();
}

export function asNullableIsoDate(value: unknown, path: string): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    return asIsoDate(value, path);
}

export function asEnum<T extends string>(
    value: unknown,
    path: string,
    allowed: readonly T[],
): T {
    if (typeof value !== "string" || !allowed.includes(value as T)) {
        fail(path, `expected one of ${allowed.join(", ")}`);
    }
    return value as T;
}

/**
 * Only absolute `https:` URLs are stored or opened. `javascript:`, `data:`, and
 * relative values are rejected instead of being silently repaired.
 */
export function sanitizeUrl(value: string): string {
    const trimmed = value.trim();
    if (trimmed === "") {
        return "";
    }
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return "";
    }
    return parsed.protocol === "https:" ? parsed.toString() : "";
}

export function asUrl(value: unknown, path: string, maxLength: number): string {
    const text = asString(value, path, maxLength);
    return sanitizeUrl(text);
}

/** Deterministic serialisation so a checksum does not depend on key order. */
export function canonicalStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value ?? null);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalStringify).join(",")}]`;
    }
    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(
            ([key, entry]) =>
                `${JSON.stringify(key)}:${canonicalStringify(entry)}`,
        );
    return `{${entries.join(",")}}`;
}

/** FNV-1a: small, dependency-free, and enough to detect accidental corruption. */
export function checksum(input: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
}
