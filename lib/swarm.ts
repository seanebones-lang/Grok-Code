import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import { getToken } from './token_manager';
import { z } from 'zod';

export async function swarmImprove(file: string, currentCode: string) {
  const openai = new OpenAI();
  const agents = ['architect', 'coder', 'tester', 'deployer', 'project_spawner'];
  const outputs = await Promise.all(agents.map(async (agent) => {
    let system = `You are ${agent} agent.`;
    if (agent === 'project_spawner') {
      system += ' Spawn new repo from vague desc using GitHub API.';
    }
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{role: 'system', content: system}, {role: 'user', content: `File: ${file}\nCode: ${currentCode}`}] 
    });
    return res.choices[0].message.content;
  }));

  // Merge + Spawn logic
  if (outputs[4]?.includes('spawn')) {  // project_spawner
    const octokit = new Octokit({auth: await getToken('github')});
    await octokit.repos.createForAuthenticatedUser({
      name: `empire-${Date.now()}`,
      description: 'Auto-spawned from swarm'
    });
  }

  return {new_code: outputs.join('\n// Swarm merge\n'), improved: true};
}