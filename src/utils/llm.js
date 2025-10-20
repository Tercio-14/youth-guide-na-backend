const logger = require('./logger');

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1/chat/completions';

const fetchImpl = typeof fetch === 'function'
  ? fetch.bind(globalThis)
  : (...args) => import('node-fetch').then(({ default: fetchModule }) => fetchModule(...args));

function parseTemperature(value) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

function buildOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (process.env.OPENROUTER_SITE_URL) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
  }

  if (process.env.OPENROUTER_APP_NAME) {
    headers['X-Title'] = process.env.OPENROUTER_APP_NAME;
  }

  return headers;
}

async function callOpenRouter({ messages, temperature, maxTokens, model }) {
  const headers = buildOpenRouterHeaders();
  const resolvedModel = model || process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';
  const resolvedTemperature = temperature ?? parseTemperature(process.env.CHAT_TEMPERATURE) ?? 0.2;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }

  const body = {
    model: resolvedModel,
    messages,
    temperature: resolvedTemperature,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  logger.info('[LLM] Sending request to OpenRouter', {
    model: resolvedModel,
    temperature: resolvedTemperature,
    messageCount: messages.length,
  });

  const response = await fetchImpl(OPENROUTER_API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    logger.error('[LLM] OpenRouter request failed', {
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
    throw new Error(`OpenRouter request failed with status ${response.status}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    logger.error('[LLM] Failed to parse OpenRouter response JSON', {
      error: error.message,
      raw: text,
    });
    throw new Error('Invalid JSON returned from OpenRouter');
  }

  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    logger.error('[LLM] OpenRouter response missing content', { response: data });
    throw new Error('OpenRouter response did not include message content');
  }

  const usage = data?.usage || {};

  logger.info('[LLM] OpenRouter request completed', {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  });

  return {
    text: content,
    raw: data,
    usage,
  };
}

async function generateChatCompletion({ messages, temperature, maxTokens, model }) {
  if (process.env.OPENROUTER_API_KEY) {
    return callOpenRouter({ messages, temperature, maxTokens, model });
  }

  throw new Error('No supported chat provider configured. Please set OPENROUTER_API_KEY.');
}

module.exports = {
  generateChatCompletion,
};
