const Groq = require("groq-sdk");

const apiKey = (process.env.AI_API_KEY || "").trim();
const configuredBaseURL = (process.env.AI_BASE_URL || "https://api.groq.com")
  .trim()
  .replace(/\/$/, "");
const baseURL = configuredBaseURL.replace(/\/openai\/v1$/, "");
const model = (process.env.AI_MODEL || "llama-3.3-70b-versatile").trim();

const groq = apiKey ? new Groq({ apiKey, baseURL }) : null;

module.exports = { groq, model };
