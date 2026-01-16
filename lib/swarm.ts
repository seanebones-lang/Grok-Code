import OpenAI from 'openai';
import { z } from 'zod';

export async function swarmImprove(file: string, currentCode: string) {
  const openai = new OpenAI();
  const agents = ['architect', 'coder', 'tester'];
  const outputs = await Promise.all(agents.map(async (agent) => {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{role: 'system', content: `You are ${agent} agent for autonomous empire. Architect: spec/arch. Coder: code. Tester: tests/fixes.`},
                 {role: 'user', content: `File: ${file}\nCode: ${currentCode}`}] 
    });
    return res.choices[0].message.content;
  }));
  // Merge logic (simple concat + zod)
  const merged = {new_code: outputs.join('\n// Agent merge\n'), improved: true};
  return merged;
}