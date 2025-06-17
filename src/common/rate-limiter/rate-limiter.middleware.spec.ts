import { RateLimiterMiddleware } from './rate-limiter.middleware';

describe('RateLimiterMiddleware', () => {
  it('should be defined', () => {
    expect(new RateLimiterMiddleware()).toBeDefined();
  });
});
