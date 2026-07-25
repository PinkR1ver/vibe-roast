const HUMOUR_LINES = Object.freeze([
  "Your prompts have requested legal counsel.",
  "Preparing a performance review for your autocomplete.",
  "No code was judged. Your tab habits, however…",
  "Turning token usage into character evidence.",
  "Your context window left a forwarding address.",
  "The agents have agreed to testify.",
  "Compiling vibes. Types may be dramatically exaggerated.",
  "Your commit history was unavailable for comment.",
]);

const STATUS_LINES = Object.freeze([
  "Dusting the fingerprints off local agent history",
  "Arranging the evidence by dramatic potential",
  "Preheating the roast without uploading your prompts",
]);

const ANSI = Object.freeze({
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  green: "\u001b[38;5;42m",
  orange: "\u001b[38;5;208m",
  cream: "\u001b[38;5;223m",
});

function supportsRichOutput(stream = process.stderr, env = process.env) {
  return Boolean(
    stream?.isTTY
      && env.NO_COLOR == null
      && env.TERM !== "dumb"
      && env.CI !== "true"
      && env.VIBE_ROAST_PLAIN_OUTPUT !== "1",
  );
}

function pickHumour(random = Math.random) {
  const value = Number(random());
  const index = Number.isFinite(value)
    ? Math.min(HUMOUR_LINES.length - 1, Math.max(0, Math.floor(value * HUMOUR_LINES.length)))
    : 0;
  return HUMOUR_LINES[index];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTerminalLaunch({
  stream = process.stderr,
  env = process.env,
  random = Math.random,
  frameDelay = 38,
} = {}) {
  const rich = supportsRichOutput(stream, env);

  function write(text) {
    stream.write(text);
  }

  function intro() {
    if (!rich) return;
    const joke = pickHumour(random);
    write(
      `\n${ANSI.orange}╭─${ANSI.reset} ${ANSI.bold}${ANSI.cream}VIBE ROAST${ANSI.reset} ${ANSI.dim}· local evidence lab${ANSI.reset}\n`
      + `${ANSI.orange}│${ANSI.reset}  ${joke}\n`
      + `${ANSI.orange}╰────────────────────────────────────────────${ANSI.reset}\n\n`,
    );
  }

  async function animateStatus(label) {
    if (!rich) return;
    const frames = ["◜", "◠", "◝", "◞", "◡", "◟"];
    for (const frame of frames) {
      write(`\r\u001b[2K  ${ANSI.orange}${frame}${ANSI.reset} ${ANSI.dim}${label}${ANSI.reset}`);
      await sleep(frameDelay);
    }
    write(`\r\u001b[2K  ${ANSI.green}◆${ANSI.reset} ${label}\n`);
  }

  async function ready(url) {
    if (!rich) {
      write(`vibe-roast result         → ${url}\n`);
      return;
    }

    for (const label of STATUS_LINES) await animateStatus(label);
    write(
      `\n  ${ANSI.green}${ANSI.bold}ROAST LAB OPEN${ANSI.reset}\n`
      + `  ${ANSI.dim}Local dashboard${ANSI.reset}  ${ANSI.bold}${url}${ANSI.reset}\n`
      + `  ${ANSI.dim}Keep this terminal open. Your prompts stay on this machine.${ANSI.reset}\n\n`,
    );
  }

  return { intro, ready, rich };
}

module.exports = {
  ANSI,
  HUMOUR_LINES,
  STATUS_LINES,
  createTerminalLaunch,
  pickHumour,
  supportsRichOutput,
};
