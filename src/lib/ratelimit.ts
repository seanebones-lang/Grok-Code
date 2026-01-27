import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Edge-compatible Redis client
const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // Adjust limits as needed
  analytics: true,
});
