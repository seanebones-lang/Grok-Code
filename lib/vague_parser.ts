import OpenAI from 'openai';
import { z } from 'zod';

const ParseSpecSchema = z.object({
  requirements: z.array(z.string()),
  tech_stack: z.array(z.string()),
  deploy: z.object({host: z.string(), ci_cd: z.boolean()})
});

export async function parseVague(desc: string) {
  const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {role: 'system', content: 'Parse vague desc to structured enterprise spec JSON only.'},
      {role: 'user', content: desc}
    ]
  });
  return ParseSpecSchema.parse(JSON.parse(response.choices[0].message.content || '{}'));
}

export async function genFilesFromSpec(spec: z.infer<typeof ParseSpecSchema>) {
  // Scaffold: prisma/schema.prisma, app/page.tsx etc.
  console.log('Generated files from spec:', spec);
}