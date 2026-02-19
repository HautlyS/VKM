#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VKM_CLI = '/home/ubuntu/VKM/vkm/bin/vkm';

function getActiveKey() {
  try {
    const result = execSync(`node ${VKM_CLI} get-active`, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

function getConfig() {
  try {
    const result = execSync(`node ${VKM_CLI} get-config`, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

function refreshConfig() {
  const config = getConfig();
  if (!config || config.error) {
    console.error('Failed to get VKM config');
    return false;
  }

  const configPath = process.argv[2] || path.join(process.env.HOME, '.zeroclaw', 'vkm-config.json');
  const configDir = path.dirname(configPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify({
    apiKey: config.APIKEY,
    baseUrl: config.BASEURL,
    model: config.MODEL,
    provider: config.PROVIDER,
    updatedAt: new Date().toISOString()
  }, null, 2));

  console.log(`VKM config written to: ${configPath}`);
  return true;
}

const cmd = process.argv[2];

if (cmd === 'refresh' || cmd === '--refresh') {
  refreshConfig();
} else if (cmd === 'active' || cmd === '--active') {
  const key = getActiveKey();
  console.log(JSON.stringify(key, null, 2));
} else if (cmd === 'config' || cmd === '--config') {
  const config = getConfig();
  console.log(JSON.stringify(config, null, 2));
} else {
  const key = getActiveKey();
  if (key && key.key) {
    console.log(`VKM Active: ${key.provider} - ${key.name}`);
    console.log(`Key: ${key.key.substring(0, 20)}...`);
  } else {
    console.log('No active VKM key');
  }
}
