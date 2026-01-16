import Vercel from 'vercel';
import Docker from 'dockerode';
import { runTests } from '../scripts/self_improve';

const docker = new Docker();

export async function autoDeploy() {
  try {
    // Primary: Vercel
    const vercel = new Vercel({token: process.env.VERCEL_TOKEN});
    if (await runTests()) {
      const deployment = await vercel.deploy({name: 'grok-empire-self', projectId: process.env.VERCEL_PROJECT_ID});
      return deployment.url;
    }
  } catch (vercelErr) {
    console.log('Vercel fail → Docker fallback:', vercelErr);
  }

  // Fallback: Local Docker
  try {
    await docker.buildImage({
      context: '.',
      src: ['.']
    }, { t: 'empire-self:latest' });
    const container = await docker.createContainer({
      Image: 'empire-self:latest',
      name: 'empire-self',
      Ports: [{'3000/tcp': 3000}]
    });
    await container.start();
    return `http://localhost:3000 (Docker: ${container.id.slice(0,12)})`;
  } catch (dockerErr) {
    throw new Error(`All deploys failed: ${dockerErr}`);
  }
}