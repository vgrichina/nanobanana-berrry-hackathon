/**
 * Database helpers for tests - each test file manages its own pool
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

/**
 * Create and initialize a test database with schema
 * @param {string} testName - Name identifier for the test (e.g., 'app-forking')
 * @returns {Promise<{pool: Pool, dbName: string}>} Database pool and name
 */
async function createTestDatabase(testName) {
  // Generate unique database name (replace hyphens with underscores and convert to lowercase for PostgreSQL compatibility)
  const safeName = testName.replace(/-/g, '_').toLowerCase();
  const dbName = `berrryweb_test_${safeName}_${crypto.randomBytes(4).toString('hex')}`;
  
  // Create the database
  await createDatabase(dbName);
  
  // Create pool for the test database
  const pool = new Pool({
    database: dbName,
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
  });
  
  // Initialize database schema
  await initializeDatabase(pool, dbName);
  
  return { pool, dbName };
}

/**
 * Create the test database
 */
async function createDatabase(dbName) {
  // Connect to postgres to manage database creation
  const pgPool = new Pool({
    database: 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
  });
  
  const pgClient = await pgPool.connect();
  try {
    console.log(`Setting up test database: ${dbName}...`);
    
    // Create test database
    await pgClient.query(`CREATE DATABASE ${dbName}`);
    
    console.log(`Database ${dbName} created successfully`);
  } catch (err) {
    console.error(`Error setting up database ${dbName}:`, err);
    throw err;
  } finally {
    pgClient.release();
    await pgPool.end();
  }
}

/**
 * Initialize the database schema using migrations
 */
async function initializeDatabase(pool, dbName) {
  console.log(`Initializing test database schema for ${dbName}...`);
  
  // Set environment variable for migrations
  const oldDbName = process.env.PG_DATABASE;
  process.env.PG_DATABASE = dbName;
  
  try {
    // Import and run migrations directly
    const migrations = require('../../scripts/apply-migrations');
    console.log('Starting database migration...');
    await migrations.runMigrations({ pool });
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error running migrations:', err);
    throw new Error('Database initialization failed: ' + err.message);
  } finally {
    // Restore original database name environment variable
    if (oldDbName) {
      process.env.PG_DATABASE = oldDbName;
    } else {
      delete process.env.PG_DATABASE;
    }
  }
  
  // Verify the schema was created correctly
  try {
    const result = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requests')");
    if (!result.rows[0].exists) {
      console.error('Database initialization failed: requests table not found');
      throw new Error('Database initialization failed: schema not properly set up');
    }
    console.log('Database schema verification successful');
  } catch (err) {
    console.error('Error verifying database schema:', err);
    throw err;
  }
  
  console.log(`Test database schema initialized for ${dbName}`);
}

/**
 * Create a test database instance using the provided pool
 * @param {Pool} testPool - The test database pool
 * @returns {object} Database instance configured with test pool
 */
function createTestDbInstance(testPool) {
  const createDb = require('../../src/db');
  return createDb(testPool);
}

/**
 * Create a test context with test database and real dependencies
 * @param {Pool} testPool - The test database pool
 * @param {Object} options - Configuration options (e.g., twitterConfig)
 * @returns {object} Test context with test db and real dependencies
 */
function createTestContext(testPool, options = {}) {
  const db = createTestDbInstance(testPool);
  
  // Create auth module with test database
  const createAuth = require('../../src/users/auth');
  const auth = createAuth(db);
  
  // Create oauth module with test database and optional config
  const createOAuth = require('../../src/users/oauth');
  
  // Create mock fetch for tests - provide realistic test data without HTTP calls
  const mockFetch = async (url, options) => {
    // Mock Twitter OAuth token exchange
    if (url.includes('api.twitter.com/2/oauth2/token')) {
      // Parse the request body to understand what's being requested
      const body = options?.body?.toString() || '';
      
      // Check for error scenarios based on the authorization code
      if (body.includes('invalid_code')) {
        return {
          ok: false,
          status: 400,
          text: async () => 'Invalid authorization code',
          json: async () => ({ error: 'invalid_grant' })
        };
      }
      if (body.includes('expired_code')) {
        return {
          ok: false,
          status: 400,
          text: async () => 'Authorization code expired',
          json: async () => ({ error: 'invalid_grant' })
        };
      }
      if (body.includes('rate_limited')) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Rate limited',
          json: async () => ({ error: 'rate_limit_exceeded' })
        };
      }
      if (body.includes('network_error')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Network error',
          json: async () => ({ error: 'server_error' })
        };
      }
      
      // Successful token exchange
      return {
        ok: true,
        status: 200,
        json: async () => ({ 
          access_token: 'mock_access_token',
          token_type: 'bearer',
          expires_in: 7200
        }),
        text: async () => 'success'
      };
    }
    
    // Mock Twitter user data API
    if (url.includes('api.twitter.com/2/users/me')) {
      // Return test user data that matches what the tests expect
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'twitter_user_1',
            username: 'testuser123',
            name: 'Test User',
            verified: false
          }
        }),
        text: async () => 'success'
      };
    }
    
    // Default mock response for any other URLs
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => 'mock response'
    };
  };
  
  const oauth = createOAuth({ 
    db, 
    auth, 
    fetch: mockFetch, 
    twitterConfig: options.twitterConfig,
    redditConfig: options.redditConfig
  });
  
  // Mock only Twitter API to avoid external calls
  const mockTwitterApi = {
    getTweet: () => ({ data: { id: 'mock' } }),
    getParentTweets: () => ({ data: [] }),
    isConfigured: () => true,
    TwitterRateLimitError: class extends Error {}
  };
  
  // Use real dependencies
  const createLLMClient = require('../../src/llm');
  const forkDetector = require('../../src/fork-detector');
  const tweetProcessor = require('../../src/tweet-processor');
  
  // Create LLM client - allow override via options for testing
  // If no LLM provided in options, create a default one with a basic mock fetch
  const llm = options.llm || createLLMClient({ 
    fetch: options.llmFetch || mockFetch, 
    db 
  });
  
  return {
    db,
    auth,
    oauth,
    twitterApi: mockTwitterApi,
    llm,
    forkDetector,
    tweetProcessor,
    fetch: mockFetch,
    redditConfig: options.redditConfig
  };
}


/**
 * Clean up test database and connections
 */
async function cleanupTestDatabase(pool, dbName) {
  console.log(`Cleaning up test database ${dbName}...`);
  
  // Close the pool
  if (pool) {
    try {
      await pool.end();
      console.log(`Pool closed for ${dbName}`);
    } catch (err) {
      console.error(`Error closing pool for ${dbName}:`, err);
    }
  }
  
  // Drop the test database
  const pgPool = new Pool({
    database: 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
  });
  
  const pgClient = await pgPool.connect();
  try {
    await pgClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Test database ${dbName} dropped successfully`);
    
  } catch (err) {
    console.error(`Error during cleanup of ${dbName}:`, err);
  } finally {
    pgClient.release();
    await pgPool.end();
  }
}

/**
 * NEW: Create a unified test suite with factory (preferred method)
 * @param {string} testName - Name identifier for the test
 * @param {Object} options - Configuration options
 * @returns {DatabaseTestSuite} Test suite instance
 */
function createTestSuite(testName, options = {}) {
  const { createTestSuite: createSuite } = require('./database-test-suite');
  return createSuite(testName, options);
}

module.exports = {
  createTestDatabase,
  createTestDbInstance,
  createTestContext,
  cleanupTestDatabase,
  // NEW: Factory-based testing
  createTestSuite
};