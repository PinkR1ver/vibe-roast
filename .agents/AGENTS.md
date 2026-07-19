# Vibe Wrapper Agent Notes

This project is a local-first, playful "vibe coding personality" tool. It analyzes local AI coding session history and produces MBTI-like profile results meant for social sharing.

Current direction:
- First milestone is a data access spike, not the final personality engine.
- Initial sources are Codex, Claude Code, and Cursor local session data.
- TokenTracker is MIT-licensed and is the primary reference for source discovery and adapter structure.
- The product should eventually support date-based result generation because a user's vibe coding style changes over time.

Coordination:
- Keep durable project decisions in `.agents/`.
- Do not store secrets or raw private session dumps in `.agents/`.
