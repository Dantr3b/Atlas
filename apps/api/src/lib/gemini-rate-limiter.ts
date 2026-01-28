interface RateLimitData {
  requestsPerMinute: number[];  // Array of timestamps in last minute
  requestsPerDay: number;        // Counter for today
  currentDate: string;           // Current day (YYYY-MM-DD)
}

class GeminiRateLimiter {
  private data: RateLimitData;
  
  // Configurable limits (Gemini free tier)
  private readonly MAX_PER_MINUTE = 15;
  private readonly MAX_PER_DAY = 1500;
  
  constructor() {
    this.data = {
      requestsPerMinute: [],
      requestsPerDay: 0,
      currentDate: this.getCurrentDate(),
    };
  }
  
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  private cleanOldRequests(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.data.requestsPerMinute = this.data.requestsPerMinute.filter(
      timestamp => timestamp > oneMinuteAgo
    );
  }
  
  private checkDayReset(): void {
    const today = this.getCurrentDate();
    if (this.data.currentDate !== today) {
      // New day, reset daily counter
      this.data.requestsPerDay = 0;
      this.data.currentDate = today;
    }
  }
  
  async checkLimit(): Promise<{ allowed: boolean; reason?: string }> {
    // Clean old requests and check for day reset
    this.cleanOldRequests();
    this.checkDayReset();
    
    // Check per-minute limit
    if (this.data.requestsPerMinute.length >= this.MAX_PER_MINUTE) {
      return { 
        allowed: false, 
        reason: `Rate limit exceeded: ${this.MAX_PER_MINUTE} requests per minute maximum` 
      };
    }
    
    // Check per-day limit
    if (this.data.requestsPerDay >= this.MAX_PER_DAY) {
      return { 
        allowed: false, 
        reason: `Daily quota exceeded: ${this.MAX_PER_DAY} requests per day maximum` 
      };
    }
    
    return { allowed: true };
  }
  
  async recordRequest(): Promise<void> {
    const now = Date.now();
    
    // Record for per-minute tracking
    this.data.requestsPerMinute.push(now);
    
    // Increment daily counter
    this.data.requestsPerDay++;
  }
  
  getStats(): { perMinute: number; perDay: number; limits: { perMinute: number; perDay: number } } {
    this.cleanOldRequests();
    this.checkDayReset();
    
    return {
      perMinute: this.data.requestsPerMinute.length,
      perDay: this.data.requestsPerDay,
      limits: {
        perMinute: this.MAX_PER_MINUTE,
        perDay: this.MAX_PER_DAY,
      },
    };
  }
}

// Singleton instance
export const geminiRateLimiter = new GeminiRateLimiter();
