const { groq, model } = require("./aiService");

const SUPPORTED_KEYWORDS = [
  "Best",
  "Medium",
  "Comedy",
  "Serious",
  "Emotional",
  "Action",
  "Story",
  "Music",
  "Rewatchable",
];

function fallbackClassify(comment = "", rating = 8) {
  const text = String(comment || "").toLowerCase();
  const numRating = Number(rating || 7);
  const tags = new Set();

  if (numRating >= 8) tags.add("Best");
  else if (numRating >= 5) tags.add("Medium");

  if (/\b(funny|comedy|laugh|hilarious|humor|humour|comic|joke|fun)\b/.test(text)) {
    tags.add("Comedy");
  }
  if (/\b(serious|intense|dark|gritty|thrill|suspense|crime|realistic|deep)\b/.test(text)) {
    tags.add("Serious");
  }
  if (/\b(emotion|emotional|cry|cried|tears|touching|heart|heartwarming|feel|goosebumps|moving)\b/.test(text)) {
    tags.add("Emotional");
  }
  if (/\b(action|fight|stunt|mass|blast|elevation|adrenaline|battle|war)\b/.test(text)) {
    tags.add("Action");
  }
  if (/\b(story|plot|script|writing|screenplay|twist|narrative)\b/.test(text)) {
    tags.add("Story");
  }
  if (/\b(bgm|music|score|soundtrack|songs|audio|dolby)\b/.test(text)) {
    tags.add("Music");
  }
  if (/\b(rewatch|again|theatre|theater|imax|worth|recommend|must)\b/.test(text)) {
    tags.add("Rewatchable");
  }

  if (tags.size === 0) {
    tags.add(numRating >= 8 ? "Best" : "Medium");
  }

  const aiScore = Math.min(
    100,
    Math.max(30, Math.round(numRating * 7 + (text.length > 35 ? 25 : 10)))
  );

  return {
    aiScore,
    aiTags: [...tags].slice(0, 4),
    aiSummary:
      text.length > 10
        ? `Rated ${numRating}/10 (${[...tags].slice(0, 2).join(", ")})`
        : `Quick rating ${numRating}/10`,
  };
}

async function classifyReviewWithAI(comment = "", rating = 8) {
  const fallback = fallbackClassify(comment, rating);
  if (!groq || !String(comment || "").trim()) {
    return fallback;
  }

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            `You are a film critic assistant. Analyze the movie review and respond ONLY with a JSON object:\n` +
            `{ "score": <integer 0-100>, "tags": [<pick 1 to 3 from: ${SUPPORTED_KEYWORDS.join(", ")}>], "summary": "<concise 6-12 word takeaway>" }.`,
        },
        {
          role: "user",
          content: `Rating: ${rating}/10\nComment: ${String(comment).slice(0, 600)}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 140,
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const aiScore = Number.isFinite(Number(parsed.score))
      ? Math.min(100, Math.max(0, Math.round(Number(parsed.score))))
      : fallback.aiScore;

    const cleanTags = Array.isArray(parsed.tags)
      ? parsed.tags
          .map((t) => String(t || "").trim())
          .filter((t) => SUPPORTED_KEYWORDS.includes(t))
      : [];

    const aiTags =
      cleanTags.length > 0 ? [...new Set(cleanTags)].slice(0, 4) : fallback.aiTags;

    const aiSummary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 140)
        : fallback.aiSummary;

    return { aiScore, aiTags, aiSummary };
  } catch (err) {
    console.warn("[Groq Classifier] Using heuristic fallback:", err.message);
    return fallback;
  }
}

module.exports = {
  SUPPORTED_KEYWORDS,
  classifyReviewWithAI,
  fallbackClassify,
};
