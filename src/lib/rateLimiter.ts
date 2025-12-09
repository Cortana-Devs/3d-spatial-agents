/**
 * Token Bucket Rate Limiter
 * Enforces a strict limit on actions per minute (RPM).
 * 
 * Usage:
 * const limiter = new RateLimiter(15, 60); // 15 requests per 60 seconds
 * if (limiter.tryConsume()) { ... }
 */
export class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number; // Tokens per ms
    private lastRefill: number;

    constructor(maxRequests: number, intervalSeconds: number) {
        this.maxTokens = maxRequests;
        this.tokens = maxRequests;
        this.refillRate = maxRequests / (intervalSeconds * 1000);
        this.lastRefill = Date.now();
    }

    public tryConsume(tokensToConsume: number = 1): boolean {
        this.refill();

        if (this.tokens >= tokensToConsume) {
            this.tokens -= tokensToConsume;
            return true;
        }

        return false;
    }

    private refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = timePassed * this.refillRate;

        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }

    public getTokensRemaining(): number {
        this.refill();
        return Math.floor(this.tokens);
    }
}
