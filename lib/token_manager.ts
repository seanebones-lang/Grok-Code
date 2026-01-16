import OpenAI from 'openai';
import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { z } from 'zod';

const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string()
});

export async function getToken(service: 'github' | 'vercel') {
  const key = process.env[`${service.toUpperCase()}_TOKEN`];
  if (key) return key;

  if (service === 'github') {
    // Device code flow (autonomous poll)
    const deviceRes = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {'Accept': 'application/json'},
      body: 'client_id=your_app_id&scope=repo%20workflow'
    }).then(res => res.json());
    console.log(`GitHub User Code: ${deviceRes.user_code} - Visit https://github.com/login/device`);

    const token = await pRetry(async () => {
      const pollRes = await fetch(`https://github.com/login/oauth/access_token?device_code=${deviceRes.device_code}&client_id=your_app_id&grant_type=urn:ietf:params:oauth:grant-type:device_code`, {
        headers: {'Accept': 'application/json'}
      }).then(res => res.json());
      return TokenResponseSchema.parse(pollRes).access_token;
    }, {retries: 60, minTimeout: 5000});

    process.env.GITHUB_TOKEN = token;
    return token;
  }

  // Vercel similar (API key gen stub - evolve)
  console.log('Vercel token: Use dashboard API key');
  return null;
}