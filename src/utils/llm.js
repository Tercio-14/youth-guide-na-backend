const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

function parseTemperature(value) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Convert OpenAI-style messages array to Gemini format.
 * Gemini requires:
 *   - system message → systemInstruction (separate field)
 *   - strictly alternating user/model roles in history
 *   - the final user message sent via chat.sendMessage()
 */
function convertMessages(messages) {
  let systemInstruction = null;
  const turns = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
      continue;
    }
    const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
    turns.push({ role: geminiRole, parts: [{ text: msg.content || '' }] });
  }

  // Enforce alternating roles — drop consecutive same-role messages by merging them
  const history = [];
  for (const turn of turns) {
    const prev = history[history.length - 1];
    if (prev && prev.role === turn.role) {
      prev.parts[0].text += '\n' + turn.parts[0].text;
    } else {
      history.push({ role: turn.role, parts: [{ text: turn.parts[0].text }] });
    }
  }

  // The last message must be a user turn sent via sendMessage()
  const last = history.pop();
  const lastUserText = last?.parts[0]?.text || '';

  return { systemInstruction, history, lastUserText };
}

/**
 * Generate a chat completion using Google Gemini.
 * Accepts the same arguments as the previous OpenRouter implementation.
 *
 * @param {Object} opts
 * @param {Array}  opts.messages     - OpenAI-style messages array
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxTokens]
 * @param {string} [opts.model]
 * @returns {Promise<{ text: string, raw: object, usage: object }>}
 */
async function generateChatCompletion({ messages, temperature, maxTokens, model }) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }

  const client = getClient();
  const resolvedModel = model || GEMINI_MODEL;
  const resolvedTemperature = temperature ?? parseTemperature(process.env.CHAT_TEMPERATURE) ?? 0.2;

  const { systemInstruction, history, lastUserText } = convertMessages(messages);

  const generationConfig = { temperature: resolvedTemperature };
  if (maxTokens) {
    generationConfig.maxOutputTokens = maxTokens;
  }

  const modelConfig = { model: resolvedModel, generationConfig };
  if (systemInstruction) {
    modelConfig.systemInstruction = systemInstruction;
  }

  const genModel = client.getGenerativeModel(modelConfig);

  logger.info('[LLM] Sending request to Gemini', {
    model: resolvedModel,
    temperature: resolvedTemperature,
    messageCount: messages.length,
    historyTurns: history.length,
  });

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(lastUserText);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('Gemini response did not include message content');
  }

  const usageMeta = response.usageMetadata || {};

  logger.info('[LLM] Gemini request completed', {
    promptTokens: usageMeta.promptTokenCount,
    completionTokens: usageMeta.candidatesTokenCount,
    totalTokens: usageMeta.totalTokenCount,
  });

  return {
    text,
    raw: response,
    usage: {
      prompt_tokens: usageMeta.promptTokenCount || 0,
      completion_tokens: usageMeta.candidatesTokenCount || 0,
      total_tokens: usageMeta.totalTokenCount || 0,
    },
  };
}

module.exports = {
  generateChatCompletion,
};
