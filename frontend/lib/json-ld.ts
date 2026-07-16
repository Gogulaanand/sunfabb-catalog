/**
 * Serializes data to a JSON string safe for embedding in a <script> tag.
 * JSON.stringify alone does not escape `<` / `>` / `&`, so a value like
 * `</script><img onerror=...>` would break out of the script block.
 * Unicode escapes are still valid JSON and are decoded correctly by parsers.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
