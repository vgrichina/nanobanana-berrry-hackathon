const tape = require('tape');
const http = require('http');
const { request } = require('undici');
const { createTestSuite } = require('./utils/db-setup');

// Mock successful Gemini API response
const mockGeminiSuccess = {
  candidates: [{
    content: {
      parts: [{
        inlineData: {
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // 1x1 red pixel
        }
      }]
    }
  }]
};

// Mock rate limit response
const mockGeminiRateLimit = {
  error: { message: 'Rate limit exceeded' }
};

// Create test suite - proper usage pattern
const suite = createTestSuite('nanobanana-integration');
let suiteReady;
let server;
let TEST_PORT;
let BASE_URL;

suiteReady = suite.setup().then(async () => {
  // Set test API key for Gemini service
  process.env.GEMINI_API_KEY = 'test-api-key';
  
  // Create a test app first to provide app context for nanobanana API
  const testApp = await suite.factory.createApp(
    await suite.factory.users.create({ email: 'nano-test@example.com' }),
    { subdomain: 'test-nanobanana', files: [{ name: 'index.html', content: '<h1>Test</h1>' }] }
  );
  
  // Create server for nanobanana API endpoints
  const { createApp } = require('../src/server');
  const app = createApp(suite.context);
  
  server = http.createServer(app.callback()).listen(0);
  TEST_PORT = server.address().port;
  BASE_URL = `http://localhost:${TEST_PORT}`;
  
  // Store the test app for use in tests
  suite.testApp = testApp;
  
  return suite;
});

// Helper function to make requests with proper app context
async function makeAppRequest(path, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      'Host': `${suite.testApp.subdomain}.berrry.localdomain`,
      ...options.headers
    }
  };
  
  return await request(`${BASE_URL}${path}`, requestOptions);
}

tape('Nano Banana API Integration Tests', async (t) => {
  await suiteReady;

  t.test('GET /api/nanobanana/image/:width/:height with prompt', async (st) => {
    // Setup mock for successful generation
    suite.setMockFetch(async (url, options) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => mockGeminiSuccess
        };
      }
      throw new Error(`Unexpected request to ${url}`);
    });

    try {
      const response = await makeAppRequest('/api/nanobanana/image/512/512?prompt=A%20banana%20in%20space');

      st.equal(response.statusCode, 200, 'Should return 200 OK');
      st.equal(response.headers['content-type'], 'image/png', 'Should return PNG image');
      
      const imageData = await response.body.arrayBuffer();
      st.ok(imageData.byteLength > 0, 'Should return image data');

    } catch (error) {
      st.fail(`Request failed: ${error.message}`);
    }

    st.end();
  });

  t.test('GET /api/nanobanana/image/:width/:height without prompt', async (st) => {
    try {
      const response = await makeAppRequest('/api/nanobanana/image/512/512');

      st.equal(response.statusCode, 400, 'Should return 400 Bad Request');
      
      const errorData = await response.body.json();
      st.ok(errorData.error, 'Should return error message');
      st.ok(errorData.error.includes('prompt'), 'Error should mention missing prompt');

    } catch (error) {
      st.fail(`Request failed: ${error.message}`);
    }

    st.end();
  });

  t.test('GET /api/nanobanana/image/:width/:height with invalid dimensions', async (st) => {
    try {
      const response = await makeAppRequest('/api/nanobanana/image/2000/2000?prompt=test');

      st.equal(response.statusCode, 400, 'Should return 400 Bad Request');
      
      const errorData = await response.body.json();
      st.ok(errorData.error, 'Should return error message');
      st.ok(errorData.error.includes('Validation failed'), 'Error should mention validation failure');

    } catch (error) {
      st.fail(`Request failed: ${error.message}`);
    }

    st.end();
  });

  t.end();
});

// Cleanup
tape.onFinish(() => {
  if (server) {
    server.close();
  }
  if (suite.cleanup) {
    suite.cleanup();
  }
});