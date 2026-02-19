#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VKM_DIR = path.join(process.env.HOME, '.vkm');
const KEYS_FILE = path.join(VKM_DIR, 'keys.json');
const STATE_FILE = path.join(VKM_DIR, 'state.json');
const SERVICES_FILE = path.join(VKM_DIR, 'services.json');

const DEFAULT_SERVICES = {
  modal: {
    name: 'Modal GLM-5',
    defaultUrl: 'https://api.us-west-2.modal.direct/v1',
    testModel: 'zai-org/GLM-5-FP8'
  },
  openrouter: {
    name: 'OpenRouter',
    defaultUrl: 'https://openrouter.ai/api/v1',
    testModel: 'arcee-ai/trinity-large-preview:free'
  }
};

const SERVICE_PRIORITY = ['modal', 'openrouter', 'anthropic', 'openai', 'groq'];

function loadKeys() {
  if (!fs.existsSync(KEYS_FILE)) return {};
  return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { currentKeyIndex: {} };
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  if (!fs.existsSync(VKM_DIR)) {
    fs.mkdirSync(VKM_DIR, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadServices() {
  let custom = {};
  if (fs.existsSync(SERVICES_FILE)) {
    custom = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8'));
  }
  return { ...DEFAULT_SERVICES, ...custom };
}

async function checkKeyHealth(serviceId, apiKey, service) {
  const https = require('https');
  
  return new Promise((resolve) => {
    const baseUrl = service.defaultUrl.replace('https://', '').replace('http://', '');
    const [hostname, ...pathParts] = baseUrl.split('/');
    const basePath = '/' + pathParts.join('/');
    
    const data = JSON.stringify({
      model: service.testModel,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });

    const options = {
      hostname,
      port: service.defaultUrl.startsWith('https') ? 443 : 80,
      path: `${basePath}/chat/completions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve({ healthy: true });
      } else if (res.statusCode === 429) {
        resolve({ healthy: true, rateLimited: true });
      } else {
        resolve({ healthy: false, status: res.statusCode });
      }
    });

    req.on('error', () => resolve({ healthy: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, timeout: true });
    });

    req.write(data);
    req.end();
  });
}

async function getActiveKey() {
  const keys = loadKeys();
  const state = loadState();
  const services = loadServices();

  for (const serviceId of SERVICE_PRIORITY) {
    const serviceKeys = keys[serviceId];
    if (!serviceKeys || serviceKeys.length === 0) continue;

    const currentIndex = state.currentKeyIndex?.[serviceId] || 0;

    for (let i = 0; i < serviceKeys.length; i++) {
      const idx = (currentIndex + i) % serviceKeys.length;
      const keyData = serviceKeys[idx];

      if (!keyData || !keyData.key) continue;

      const health = await checkKeyHealth(serviceId, keyData.key, services[serviceId]);

      if (health.healthy) {
        state.currentKeyIndex = state.currentKeyIndex || {};
        state.currentKeyIndex[serviceId] = idx;
        saveState(state);

        return {
          service: serviceId,
          key: keyData.key,
          name: keyData.name,
          model: services[serviceId]?.testModel,
          baseUrl: services[serviceId]?.defaultUrl
        };
      }
    }
  }

  return null;
}

function getActiveKeySync() {
  try {
    const result = execSync('vkm get-active', { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

function getConfigSync() {
  try {
    const result = execSync('vkm get-config', { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

module.exports = {
  getActiveKey,
  getActiveKeySync,
  getConfigSync,
  loadKeys,
  loadState,
  loadServices,
  SERVICE_PRIORITY
};

if (require.main === module) {
  (async () => {
    const key = await getActiveKey();
    if (key) {
      console.log(JSON.stringify(key));
    } else {
      console.log(JSON.stringify({ error: 'No healthy keys available' }));
    }
  })();
}
