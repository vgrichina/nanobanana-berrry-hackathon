/**
 * Configuration module for environment variables and app settings
 */

/**
 * Parse BERRRY_DOMAIN and ensure it has a protocol
 * Supports both formats:
 * - "berrry.app" (adds https://)
 * - "https://berrry.app" or "http://localhost:3000" (uses as-is)
 */
function parseBaseUrl(domainString) {
  if (!domainString) {
    return 'https://berrry.app';
  }

  // If domain already includes protocol, use as-is
  if (domainString.includes('://')) {
    return domainString;
  }

  // If no protocol specified, assume https
  return `https://${domainString}`;
}

const config = {
  // Server configuration
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  
  // Base URL for the application (includes protocol)
  baseUrl: parseBaseUrl(process.env.BERRRY_DOMAIN),
  
  // Helper function to build app URLs
  getAppUrl(subdomain) {
    const url = new URL(this.baseUrl);
    return `${url.protocol}//${subdomain}.${url.host}`;
  },
  
  // Helper function to build main site URLs
  getSiteUrl(path = '') {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  },
  
  // Helper function to get subdomain.domain (without protocol) for views
  getAppDomain(subdomain) {
    const url = new URL(this.baseUrl);
    return `${subdomain}.${url.host}`;
  },

  // Helper function to get cookie domain for cross-subdomain auth
  getCookieDomain() {
    const url = new URL(this.baseUrl);
    // For localhost, don't set domain (let browser handle it)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return undefined;
    }
    // For real domains, use dot prefix for subdomain sharing
    return `.${url.hostname}`;
  },

  // API Keys
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  
  // Twitter OAuth
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    get callbackUrl() {
      return process.env.TWITTER_CALLBACK_URL || config.getSiteUrl('/auth/twitter/callback');
    }
  },
  
  // Session configuration
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
  
  // Screenshot configuration
  maxConcurrentScreenshots: process.env.MAX_CONCURRENT_SCREENSHOTS ? 
    parseInt(process.env.MAX_CONCURRENT_SCREENSHOTS) : 1,
    
  // Reddit configuration
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    userAgent: process.env.REDDIT_USER_AGENT || 'server:app.berrry.mention-bot:v1.0.0 (by /u/BerrryBot)',
    get redirectUri() {
      return process.env.REDDIT_REDIRECT_URI || (
        process.env.NODE_ENV === 'production' 
          ? config.getSiteUrl('/auth/reddit/callback')
          : 'http://localhost:3000/auth/reddit/callback'
      );
    }
  },
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL
};

module.exports = config;