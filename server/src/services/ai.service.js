const axios = require('axios');
const { ai } = require('../config/env');

exports.provider = ai.provider;
exports.model = ai.model;
exports.isConfigured = () => ['anthropic', 'openai'].includes(ai.provider) && !!ai.apiKey;

// Returns plain text from the configured provider. Throws on any failure (callers fall back).
exports.complete = async ({ system, prompt, maxTokens = 900 }) => {
  if (!exports.isConfigured()) throw new Error('AI is not configured');
  if (ai.provider === 'anthropic') {
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model: ai.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] },
      { timeout: 25000, headers: { 'x-api-key': ai.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } }
    );
    return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  }
  const { data } = await axios.post(
    `${ai.baseUrl.replace(/\/$/, '')}/chat/completions`,
    { model: ai.model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] },
    { timeout: 25000, headers: { Authorization: `Bearer ${ai.apiKey}` } }
  );
  return data.choices?.[0]?.message?.content || '';
};

// Pulls the first JSON object out of a model reply (tolerates code fences / chatter).
exports.parseJsonObject = (text) => {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON in AI reply');
  return JSON.parse(text.slice(a, b + 1));
};
