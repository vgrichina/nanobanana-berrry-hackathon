/**
 * Common database setup for tests with a single shared pool
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

// Generate a unique DB name for this test run
const TEST_DB_NAME = `berrryweb_test_${crypto.randomBytes(2).toString('hex')}`;

// Shared singleton pool instance
let sharedPool = null;
let dbInitialized = false;
let poolClosing = false;
let referenceCount = 0;

/**
 * Get a connection to the test database, creating it if needed
 * @returns {Promise<Pool>} Database pool for the test database
 */
async function getTestDatabasePool() {
  // Increment reference count
  referenceCount++;
  
  // Return existing pool if we have one
  if (sharedPool && !poolClosing) {
    console.log(`Reusing existing test database pool (ref count: ${referenceCount})`);
    return sharedPool;
  }
  
  // Create test database if needed
  if (!dbInitialized) {
    await createTestDatabase();
    dbInitialized = true;
  }
  
  // Create pool if needed
  if (!sharedPool || poolClosing) {
    poolClosing = false;
    sharedPool = new Pool({
      database: TEST_DB_NAME,
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD
    });
    
    // Override end method to reset state
    const originalEnd = sharedPool.end.bind(sharedPool);
    sharedPool.end = async function() {
      if (poolClosing) return; // Prevent multiple calls
      poolClosing = true;
      const result = await originalEnd();
      sharedPool = null;
      return result;
    };
  }
  
  // Initialize database schema if not initialized
  try {
    await initializeDatabase();
    dbInitialized = true;
  } catch (err) {
    console.error('Error initializing database schema:', err);
    throw err;
  }
  
  return sharedPool;
}

/**
 * Create the test database
 */
async function createTestDatabase() {
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
    console.log(`Setting up test database: ${TEST_DB_NAME}...`);
    
    // First, terminate any existing connections to the test database
    await pgClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DB_NAME]);
    
    // Drop test database if it exists
    await pgClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    
    // Create test database
    await pgClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    
    console.log(`Database ${TEST_DB_NAME} created successfully`);
  } catch (err) {
    console.error(`Error setting up database ${TEST_DB_NAME}:`, err);
    throw err;
  } finally {
    pgClient.release();
    await pgPool.end();
  }
}

/**
 * Initialize the database schema using migrations
 */
async function initializeDatabase() {
  if (!sharedPool) {
    throw new Error('Cannot initialize database without a pool');
  }
  
  console.log('Initializing test database schema...');
  
  // Always use migrations to initialize database schema
  console.log('Using migrations to initialize database schema...');
  
  // Set environment variable for migrations
  const oldDbName = process.env.PG_DATABASE;
  process.env.PG_DATABASE = TEST_DB_NAME;
  
  try {
    // Import and run migrations directly
    const migrations = require('../../scripts/apply-migrations');
    console.log('Starting database migration...');
    await migrations.runMigrations({ pool: sharedPool });
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
    const result = await sharedPool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requests')");
    if (!result.rows[0].exists) {
      console.error('Database initialization failed: requests table not found');
      throw new Error('Database initialization failed: schema not properly set up');
    }
    console.log('Database schema verification successful');
  } catch (err) {
    console.error('Error verifying database schema:', err);
    throw err;
  }
  
  console.log('Test database schema initialized');
}

/**
 * Setup a test database environment with the shared pool
 * @returns {Promise<Pool>} Database pool for the test database
 */
async function setupTestDatabase() {
  return getTestDatabasePool();
}

/**
 * Replace the pool in db.js with our test pool
 * @param {object} db - The database module
 * @returns {object} The modified db module
 */
async function useTestDatabase(db) {
  const testPool = await getTestDatabasePool();
  
  // Save original pool methods if not already saved
  if (!db.pool._originalMethods) {
    db.pool._originalMethods = {
      end: db.pool.end,
      connect: db.pool.connect,
      query: db.pool.query
    };
  }
  
  // Replace with test pool methods
  db.pool.end = function() {
    console.log('Ignoring pool.end() call from application code');
    // Don't actually close the pool
    return Promise.resolve();
  };
  db.pool.connect = testPool.connect.bind(testPool);
  db.pool.query = testPool.query.bind(testPool);
  
  return db;
}

/**
 * Restore original pool methods
 * @param {object} db - The database module
 */
function restoreDatabase(db) {
  if (db.pool && db.pool._originalMethods) {
    const originalMethods = db.pool._originalMethods;
    db.pool.end = originalMethods.end;
    db.pool.connect = originalMethods.connect;
    db.pool.query = originalMethods.query;
    delete db.pool._originalMethods;
  }
}

/**
 * Clean up test database and connections
 * Decrements reference count and only closes when count reaches 0
 */
async function teardownTestDatabase() {
  // Decrement reference count
  referenceCount--;
  console.log(`Released test database pool (ref count: ${referenceCount})`);
  
  // Don't close if others are still using it
  if (referenceCount > 0) {
    return;
  }
  
  // Close pool if we have one and no more references
  if (sharedPool && !poolClosing) {
    console.log('Closing test database pool');
    try {
      await sharedPool.end();
    } catch (err) {
      console.error('Error closing pool:', err);
    }
  }
}

/**
 * Force tear down the test database, regardless of reference count
 */
async function forceCleanup() {
  // Reset reference count
  referenceCount = 0;
  
  // Close pool if open
  if (sharedPool && !poolClosing) {
    console.log('Force closing test database pool');
    try {
      await sharedPool.end();
    } catch (err) {
      console.error('Error closing pool during force cleanup:', err);
    }
  }
  
  // Connect to postgres to drop the test database
  const pgPool = new Pool({
    database: 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
  });
  
  const pgClient = await pgPool.connect();
  try {
    // Terminate any existing connections
    await pgClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DB_NAME]);
    
    // Drop the test database
    await pgClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log(`Test database ${TEST_DB_NAME} dropped successfully`);
    
    // Reset state
    dbInitialized = false;
    sharedPool = null;
    poolClosing = false;
    
  } catch (err) {
    console.error('Error during force cleanup:', err);
  } finally {
    pgClient.release();
    await pgPool.end();
  }
}

module.exports = {
  setupTestDatabase,
  useTestDatabase,
  restoreDatabase,
  teardownTestDatabase,
  forceCleanup,
  TEST_DB_NAME
};