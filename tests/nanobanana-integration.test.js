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
    // Override the service creation to use mock fetch
    const originalCreateService = require('../src/backend-api/nanobanana-service').createNanoBananaService;
    require.cache[require.resolve('../src/backend-api/nanobanana-service')].exports.createNanoBananaService = (options = {}) => {
      const mockFetch = async (url, options) => {
        if (url.includes('generativelanguage.googleapis.com')) {
          return {
            ok: true,
            json: async () => mockGeminiSuccess
          };
        }
        throw new Error(`Unexpected request to ${url}`);
      };
      return originalCreateService({ ...options, fetch: mockFetch });
    };

    try {
      const response = await makeAppRequest('/api/nanobanana/image/512/512?prompt=A%20banana%20in%20space');

      st.equal(response.statusCode, 200, 'Should return 200 OK');
      st.equal(response.headers['content-type'], 'image/png', 'Should return PNG image');
      
      const imageData = await response.body.arrayBuffer();
      st.ok(imageData.byteLength > 0, 'Should return image data');

    } catch (error) {
      st.fail(`Request failed: ${error.message}`);
    } finally {
      // Restore original service
      require.cache[require.resolve('../src/backend-api/nanobanana-service')].exports.createNanoBananaService = originalCreateService;
    }

    st.end();
  });

  t.test('GET /api/nanobanana/image/:width/:height without prompt', async (st) => {
    try {
      const response = await makeAppRequest('/api/nanobanana/image/512/512');

      st.equal(response.statusCode, 400, 'Should return 400 Bad Request');
      
      const errorData = await response.body.json();
      st.ok(errorData.error, 'Should return error message');
      st.ok(errorData.error.includes('prompt') || errorData.error.includes('Missing required parameter'), 'Error should mention missing prompt');

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

  t.test('Nano Banana service - Reference image processing', async (st) => {
    // Test the service directly with reference images
    const { createNanoBananaService } = require('../src/backend-api/nanobanana-service');
    
    let geminiRequestBody = null;
    const mockFetch = async (url, options) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        geminiRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => mockGeminiSuccess
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const service = createNanoBananaService({ 
      fetch: mockFetch,
      apiKey: 'test-api-key'
    });

    const params = {
      prompt: 'Create an image using the reference as inspiration',
      width: 512,
      height: 512,
      reference_images_base64: [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      ]
    };

    try {
      const result = await service.generateImage(params);

      // Verify the request was processed correctly
      st.ok(result.base64_image, 'Should return base64 image data');
      st.equal(result.operation, 'generate', 'Should detect generate operation with single reference image');

      // Verify Gemini API received reference image data
      st.ok(geminiRequestBody, 'Should make request to Gemini API');
      st.ok(geminiRequestBody.contents, 'Should have contents in request');
      st.ok(geminiRequestBody.contents[0].parts, 'Should have parts in contents');
      
      // Check that reference image was included
      const parts = geminiRequestBody.contents[0].parts;
      const hasImageData = parts.some(part => part.inlineData && part.inlineData.data);
      st.ok(hasImageData, 'Should include reference image data in Gemini request');

      // Verify text prompt was included
      const hasTextPrompt = parts.some(part => part.text && part.text.includes('reference as inspiration'));
      st.ok(hasTextPrompt, 'Should include text prompt in Gemini request');

    } catch (error) {
      st.fail(`Test failed with error: ${error.message}`);
    }

    st.end();
  });

  t.test('Nano Banana service - Multiple reference images', async (st) => {
    const { createNanoBananaService } = require('../src/backend-api/nanobanana-service');
    
    let geminiRequestBody = null;
    const mockFetch = async (url, options) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        geminiRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => mockGeminiSuccess
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const service = createNanoBananaService({ 
      fetch: mockFetch,
      apiKey: 'test-api-key'
    });

    const params = {
      prompt: 'Create an image combining these references',
      width: 512,
      height: 512,
      reference_images_base64: [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      ]
    };

    try {
      const result = await service.generateImage(params);

      // Verify multiple images were processed
      const parts = geminiRequestBody.contents[0].parts;
      const imageDataParts = parts.filter(part => part.inlineData && part.inlineData.data);
      st.equal(imageDataParts.length, 2, 'Should include both reference images in Gemini request');
      st.equal(result.operation, 'compose', 'Should detect compose operation with multiple references');

    } catch (error) {
      st.fail(`Test failed with error: ${error.message}`);
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