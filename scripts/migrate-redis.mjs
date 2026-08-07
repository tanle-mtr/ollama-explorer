#!/usr/bin/env node
/**
 * Redis Migration Script
 * Migrates data from old Upstash Redis to new instance
 * Usage: node scripts/migrate-redis.mjs
 */

const oldUrl = process.argv[2] || 'https://busy-caiman-70293.upstash.io';
const oldToken = process.argv[3] || process.env.UPSTASH_REDIS_REST_TOKEN_OLD;
const newUrl = process.argv[4] || 'https://strong-roughy-199744.upstash.io';
const newToken = process.argv[5] || process.env.UPSTASH_REDIS_REST_TOKEN_NEW;

if (!oldToken || !newToken) {
  console.error('Error: Provide old and new tokens');
  process.exit(1);
}

const oldHeaders = {
  Authorization: `Bearer ${oldToken}`,
  'Content-Type': 'application/json',
};

const newHeaders = {
  Authorization: `Bearer ${newToken}`,
  'Content-Type': 'application/json',
};

async function redisPost(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log('Starting Redis migration...');
  console.log(`Old: ${oldUrl}`);
  console.log(`New: ${newUrl}`);

  // Step 1: Get all keys from old Redis
  console.log('\nStep 1: Reading keys from old Redis...');
  const keysResult = await redisPost(oldUrl, oldToken, [['KEYS', 'ollama:*']]);
  const allKeys = keysResult[0]?.result || [];
  console.log(`Found ${allKeys.length} keys`);

  // Step 2: Migrate all data
  console.log('\nStep 2: Migrating data...');
  const batchSize = 50;
  let migrated = 0;

  for (let i = 0; i < allKeys.length; i += batchSize) {
    const batch = allKeys.slice(i, i + batchSize);
    
    // Read from old Redis
    const getCmds = batch.map(k => ['GET', k]);
    const readResult = await redisPost(oldUrl, oldToken, getCmds);
    
    // Write to new Redis
    const setCmds = [];
    for (let j = 0; j < batch.length; j++) {
      const key = batch[j];
      const val = readResult[j]?.result;
      if (val) {
        setCmds.push(['SET', key, val, 'EX', '7776000']); // 90 days TTL
      }
    }
    
    if (setCmds.length > 0) {
      for (let k = 0; k < setCmds.length; k += 50) {
        await redisPost(newUrl, newToken, setCmds.slice(k, k + 50));
      }
    }
    
    migrated += batch.length;
    console.log(`  ${migrated}/${allKeys.length}`);
  }

  // Step 3: Rebuild indexes
  console.log('\nStep 3: Rebuilding indexes...');
  const hostKeysResult = await redisPost(newUrl, newToken, [['KEYS', 'ollama:host:*']]);
  const hostKeys = hostKeysResult[0]?.result || [];
  console.log(`Processing ${hostKeys.length} hosts...`);

  for (let i = 0; i < hostKeys.length; i += batchSize) {
    const batch = hostKeys.slice(i, i + batchSize);
    const getCmds = batch.map(k => ['GET', k]);
    const readResult = await redisPost(newUrl, newToken, getCmds);
    
    const saddCmds = [];
    for (let j = 0; j < batch.length; j++) {
      const val = readResult[j]?.result;
      if (val) {
        const host = JSON.parse(val);
        const ip = host.ip;
        saddCmds.push(
          ['SADD', 'ollama:all', ip],
          ['SADD', `ollama:port:${host.port}`, ip],
          ['SADD', `ollama:status:${host.statusCode}`, ip]
        );
        for (const m of host.models || []) {
          saddCmds.push(
            ['SADD', 'ollama:modelnames', m],
            ['SADD', `ollama:models:${m}`, ip]
          );
        }
      }
    }
    
    // Write indexes
    for (let k = 0; k < saddCmds.length; k += 50) {
      await redisPost(newUrl, newToken, saddCmds.slice(k, k + 50));
    }
    console.log(`  ${Math.min(i + batchSize, hostKeys.length)}/${hostKeys.length}`);
  }

  // Step 4: Verify
  console.log('\nStep 4: Verification...');
  const verifyResult = await redisPost(newUrl, newToken, [
    ['SCARD', 'ollama:all'],
    ['SCARD', 'ollama:modelnames'],
    ['SMEMBERS', 'ollama:port:11434'],
    ['SMEMBERS', 'ollama:status:200'],
  ]);
  
  console.log(`Hosts: ${verifyResult[0]?.result}`);
  console.log(`Models: ${verifyResult[1]?.result}`);
  console.log(`Port 11434: ${verifyResult[2]?.result?.length} IPs`);
  console.log(`Status 200: ${verifyResult[3]?.result?.length} IPs`);
  
  console.log('\nMigration complete!');
}

main().catch(console.error);
