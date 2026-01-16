import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import OpenAI from 'openai';
import yaml from 'js-yaml';
import pRetry from 'p-retry';
import { z } from 'zod';
import { parseVague } from '../lib/vague_parser';
import { swarmImprove } from '../lib/swarm';
import { autoDeploy, getToken } from '../lib/token_manager';
import { getToken as tokenManager } from '../lib/token_manager';

const git = simpleGit();
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const config = yaml.load(fs.readFileSync('config/self.yaml', 'utf8')) as any;

const ImproveSchema = z.object({
  improved: z.boolean(),
  reason: z.string(),
  new_code: z.string().optional()
});

function runNpm(cmd: string) {
  const result = spawnSync('npm', cmd.split(' '), {stdio: 'inherit', cwd: process.cwd()});
  if (result.status !== 0) throw new Error(`Npm ${cmd} failed: ${result.stderr?.toString()}`);
  return result.stdout?.toString();
}

async function improveFile(file: string) {
  const currentCode = fs.readFileSync(file, 'utf8');
  const data = ImproveSchema.parse({
    // Swarm or single call + diff logic
    ...(await swarmImprove(file, currentCode))
  });
  if (!data.improved || !data.new_code) return false;

  const diffRatio = /* diff calc */ 0.05;  // Stub
  if (diffRatio < config.diff_threshold) return false;

  fs.writeFileSync(file, data.new_code);
  return true;
}

async function batchEvolve() {
  const files = process.env.FILES_TO_IMPROVE?.split(',') || [];
  if (!files.length) {
    const spec = await parseVague(process.env.VAGUE_DESC || 'autonomous swarm');
    // Gen files from spec
  }

  const changes = [];
  for (const file of files) {
    if (await improveFile(file)) changes.push(file);
  }

  if (changes.length) {
    await git.add('.');
    await git.commit(`Self-evolve batch: ${changes.join(', ')}`);
    await git.push();

    const deployUrl = await autoDeploy();
    console.log('Deployed:', deployUrl);
  }
}

function runInfiniteLoop() {
  setInterval(batchEvolve, 600000);  // 10min
  batchEvolve();  // Initial
}

// Check tokens
getToken('github');
getToken('vercel');

runInfiniteLoop();