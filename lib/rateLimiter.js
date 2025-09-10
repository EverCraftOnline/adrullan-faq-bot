// Simple rate limiting and cost protection
const userLimits = new Map();
const DAILY_LIMIT = 20; // requests per day per user
const COOLDOWN_MS = 30000; // 30 seconds between requests
const COOLDOWN_MS_HEAVY = 120000; // 2 minutes for heavy context

// Estimated costs (rough estimates)
const COST_PER_REQUEST = {
  ask: 0.01, // ~$0.01 per ask request with full context
  ask_simple: 0.003, // ~$0.003 per simple ask request
  quiz: 0.005, // ~$0.005 per quiz generation
  refresh: 0.02 // ~$0.02 per FAQ refresh
};

module.exports = {
  canMakeRequest(userId, commandType = 'ask') {
    const now = Date.now();
    const userData = userLimits.get(userId) || {
      requests: 0,
      lastRequest: 0,
      dailyReset: this.getNextMidnight()
    };

    // Reset daily counter if needed
    if (now > userData.dailyReset) {
      userData.requests = 0;
      userData.dailyReset = this.getNextMidnight();
    }

    // Check daily limit
    if (userData.requests >= DAILY_LIMIT) {
      return {
        allowed: false,
        reason: 'daily_limit',
        resetTime: userData.dailyReset,
        message: `You've reached your daily limit of ${DAILY_LIMIT} requests. Try again tomorrow!`
      };
    }

    // Check cooldown
    const cooldown = (commandType === 'ask') ? COOLDOWN_MS_HEAVY : COOLDOWN_MS;
    const timeSinceLastRequest = now - userData.lastRequest;
    
    if (timeSinceLastRequest < cooldown) {
      const remainingTime = Math.ceil((cooldown - timeSinceLastRequest) / 1000);
      return {
        allowed: false,
        reason: 'cooldown',
        remainingTime,
        message: `Please wait ${remainingTime} seconds before making another request.`
      };
    }

    // Update user data
    userData.requests++;
    userData.lastRequest = now;
    userLimits.set(userId, userData);

    return {
      allowed: true,
      requestsRemaining: DAILY_LIMIT - userData.requests,
      estimatedCost: COST_PER_REQUEST[commandType] || 0.01
    };
  },

  getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  },

  getUserStats(userId) {
    const userData = userLimits.get(userId);
    if (!userData) return null;

    const now = Date.now();
    const isNewDay = now > userData.dailyReset;
    
    return {
      requestsToday: isNewDay ? 0 : userData.requests,
      dailyLimit: DAILY_LIMIT,
      lastRequest: userData.lastRequest,
      nextReset: userData.dailyReset
    };
  },

  // Admin function to reset limits
  resetUserLimits(userId) {
    userLimits.delete(userId);
  },

  // Get all users (for monitoring)
  getAllUsers() {
    return Array.from(userLimits.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));
  }
};
