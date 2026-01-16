import Vercel from 'vercel';

export async function autoDeploy() {
  const vercel = new Vercel({token: process.env.VERCEL_TOKEN});
  if (await runTests()) {  // From self_improve
    const deployment = await vercel.deploy({name: 'grok-empire-self', projectId: process.env.VERCEL_PROJECT_ID});
    return deployment.url;
  }
  throw new Error('Tests failed - no deploy');
}