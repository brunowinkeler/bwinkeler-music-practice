/** Triggers a local download from an in-memory string, without a server. */
export function downloadTextFile(
    fileName: string,
    mimeType: string,
    contents: string,
): void {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
