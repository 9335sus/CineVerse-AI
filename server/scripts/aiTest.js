require('dotenv').config();
const ai = require('../src/services/ai.service');
(async () => {
  console.log('provider:', ai.provider, '| model:', ai.model, '| configured:', ai.isConfigured());
  if (!ai.isConfigured()) { console.log('NOT CONFIGURED: check AI_PROVIDER and AI_API_KEY in .env'); return; }
  try {
    const t = await ai.complete({ system: 'Reply with JSON only.', prompt: 'Return {"ok": true}', maxTokens: 200 });
    console.log(t ? 'REPLY: ' + t : 'EMPTY REPLY (model returned no text)');
  } catch (e) {
    console.log('FAILED:', e.response ? e.response.status : '', JSON.stringify(e.response ? e.response.data : e.message).slice(0, 400));
  }
})();
