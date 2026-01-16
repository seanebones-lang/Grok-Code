// Add vault integration to prior puppeteer OAuth
import vault from 'node-vault';
async function vaultStore(key, value) {
  const client = vault({endpoint: 'http://localhost:8200', token: process.env.VAULT_TOKEN});
  await client.writes(`/secrets/${key}`, {data: {value}});
}
// In getToken: await vaultStore('github_token', token);