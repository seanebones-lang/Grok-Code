// Enhanced offline: Fine-tune ollama on git log
import { spawnSync } from 'child_process';
import { execSync } from 'child_process';
const gitLog = execSync('git log --oneline -10').toString();
spawnSync('./bin/ollama', ['fine-tune', 'llama3', `--data '${gitLog.replace(/'/g, "\\'")}'`]);
console.log('Fine-tuned on repo history');