import OpenAI from 'openai';
import { z } from 'zod';

const TokenSchema = z.object({
  guide: z.string(),
  steps: z.array(z.string())
});

export async function getToken(service: 'github' | 'vercel') {
  const key = process.env[`${service.toUpperCase()}_TOKEN`];
  if (key) return key;

  const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {role: 'system', content: `Provide step-by-step guide to generate ${service} token for autonomous repo access. JSON: {guide: str, steps: []}`},
      {role: 'user', content: 'Generate token for GitHub/Vercel PAT with repo/deploy perms'}
    ]
  });
  const data = TokenSchema.parse(JSON.parse(response.choices[0].message.content || '{}'));
  console.log(`${service} Token Guide:\n${data.guide}\nSteps: ${data.steps.join('\n- ')}`);
  return null;  // Human temp; evolve to auto-oauth
}