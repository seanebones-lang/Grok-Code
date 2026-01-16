import OpenAI from 'openai';
import fetch from 'node-fetch';
import pRetry from 'p-retry';
import puppeteer from 'puppeteer';
import { z } from 'zod';

// Puppeteer browserless OAuth full auto
async function autoGenToken(service: 'github' | 'vercel') {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();

  if (service === 'github') {
    await page.goto('https://github.com/login');
    await page.type('#login_field', process.env.GITHUB_USER || '');
    await page.type('#password', process.env.GITHUB_PASS || '');
    await page.click('[name="commit"]');
    await page.waitForSelector('[data-token]', {timeout: 30000});
    const token = await page.evaluate(() => {
      return document.querySelector('[data-token]')?.textContent || localStorage.getItem('access_token');
    });
    await browser.close();
    return z.object({access_token: z.string()}).parse({access_token: token}).access_token;
  }

  // Vercel similar
  console.log('Vercel auto-gen stub');
  await browser.close();
  return null;
}

export async function getToken(service: 'github' | 'vercel') {
  let key = process.env[`${service.toUpperCase()}_TOKEN`];
  if (!key) {
    key = await autoGenToken(service);
    process.env[`${service.toUpperCase()}_TOKEN`] = key;
  }
  return key;
}