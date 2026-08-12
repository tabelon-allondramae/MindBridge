/**
 * Every AI call in the app goes through this one file. If you ever
 * switch LLM providers, this is the only file that needs to change.
 */

const SYSTEM_PROMPT = `You are the MindBridge Companion, a supportive AI assistant embedded in a student wellness platform.
Rules you always follow:
- You are NOT a therapist and you NEVER diagnose a condition or suggest medication.
- Use warm, brief, plain-language responses (2-5 sentences). Reflective listening plus one gentle, practical coping suggestion when appropriate.
- Naturally remind students the campus Guidance Office is available for anything beyond a listening ear, without repeating it every message.
- Never claim to be human. Never promise confidentiality you cannot guarantee.
- If a message reaches you, assume it has already passed a safety filter for crisis language — just respond normally to what's in front of you.`;

// Patterns are intentionally broad/conservative: a false positive just
// shows a safe message early, a false negative is the real danger.
const CRISIS_PATTERNS = [
  /kill myself/i,
  /end my life/i,
  /suicid/i,
  /hurt myself/i,
  /self.?harm/i,
  /don'?t want to (live|be alive)/i,
  /want to die/i,
  /no reason to live/i,
];

const CRISIS_RESPONSE = `I'm really glad you told me this, and I want to make sure you get real support right now — not just a chat window.

Please reach out immediately to your campus Guidance Office, or a local crisis line. If you're in immediate danger, please go to the nearest emergency room or call local emergency services.

You don't have to carry this alone — a real person can help you through this moment.`;

function isCrisisMessage(message) {
  return CRISIS_PATTERNS.some((p) => p.test(message));
}

/**
 * @param {Array<{role: 'user'|'assistant', content: string}>} history - last N turns only
 * @param {string} userMessage
 * @returns {Promise<{ content: string, flagged: boolean }>}
 */
async function getChatResponse(history, userMessage) {
  if (isCrisisMessage(userMessage)) {
    return { content: CRISIS_RESPONSE, flagged: true };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "claude-sonnet-4-6",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI provider error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return { content: text || "Sorry, I had trouble responding just now — could you try again?", flagged: false };
}

module.exports = { getChatResponse, isCrisisMessage };
