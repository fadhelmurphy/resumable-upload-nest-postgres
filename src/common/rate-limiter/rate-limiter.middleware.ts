import { Injectable, NestMiddleware } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not defined');
    }
    this.redis = new Redis(redisUrl);
  }

  async use(req, res, next) {
    const ip = req.ip;
    const count = await this.redis.incr(ip);
    if (count === 1) await this.redis.expire(ip, 60);
    if (count > 150) return res.status(429).send('Too many requests');
    next();
  }
}
