function textFromContent(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      const type = String(block.type || "").toLowerCase();
      // Only keep human-readable text blocks — skip tool/system payloads.
      if (type && !/^(text|input_text|output_text)$/.test(type)) return "";
      if (typeof block.text === "string") return block.text;
      if (typeof block.content === "string" && (!type || type === "text")) return block.content;
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** Trim and collapse horizontal whitespace; keep newlines for code/log scoring. */
function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

module.exports = { textFromContent, normalizeWhitespace };
