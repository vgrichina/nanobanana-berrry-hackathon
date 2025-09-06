const tape = require('tape');
const { createNanoBananaService } = require('../src/backend-api/nanobanana-service');
const { createImageGenerationCache } = require('../src/backend-api/image-generation-cache');

// Mock Gemini API responses
const mockSuccessResponse = {
  candidates: [{
    content: {
      parts: [{
        inlineData: {
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      }]
    }
  }]
};

const mockErrorResponse = {
  error: { message: 'API quota exceeded' }
};

// Mock fetch for different scenarios
const createMockFetch = (scenario = 'success') => {
  return async (url, requestOptions) => {
    const body = JSON.parse(requestOptions.body);
    const prompt = body.contents[0].parts[0].text;
    
    console.log(`[TEST] Mock Gemini API call: "${prompt}"`);
    
    if (scenario === 'error' || prompt.includes('error')) {
      return {
        ok: false,
        status: 429,
        text: async () => JSON.stringify(mockErrorResponse)
      };
    }
    
    return {
      ok: true,
      json: async () => mockSuccessResponse
    };
  };
};

// Service layer tests
tape('Nano Banana Service', (t) => {
  t.test('validates parameters correctly', (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch(),
      apiKey: 'test-gemini-key'
    });
    
    // Valid parameters
    const validParams = { prompt: 'wizard', width: 512, height: 512 };
    const errors = service.validateParams(validParams);
    t.equal(errors.length, 0, 'Valid params should pass validation');
    
    // Missing prompt
    const missingPrompt = { prompt: '', width: 512, height: 512 };
    const promptErrors = service.validateParams(missingPrompt);
    t.ok(promptErrors.includes('missing_prompt'), 'Should detect missing prompt');
    
    // Invalid dimensions
    const invalidDims = { prompt: 'test', width: 0, height: 3000 };
    const dimErrors = service.validateParams(invalidDims);
    t.ok(dimErrors.includes('invalid_width'), 'Should detect invalid width');
    t.ok(dimErrors.includes('invalid_height'), 'Should detect invalid height');
    
    t.end();
  });

  t.test('detects operation types correctly', (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch(),
      apiKey: 'test-gemini-key'
    });
    
    const basicParams = { prompt: 'wizard', width: 512, height: 512 };
    t.equal(service.detectOperationType(basicParams), 'generate', 'Basic params = generate');
    
    const editParams = { ...basicParams, base_image_base64: 'data:...' };
    t.equal(service.detectOperationType(editParams), 'edit', 'With base image = edit');
    
    const composeParams = { ...basicParams, reference_images_base64: ['data:1', 'data:2'] };
    t.equal(service.detectOperationType(composeParams), 'compose', 'Multiple images = compose');
    
    t.end();
  });

  t.test('generates consistent cache hashes', (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch(),
      apiKey: 'test-gemini-key'
    });
    
    const params1 = { prompt: 'wizard', width: 512, height: 512 };
    const params2 = { prompt: 'wizard', width: 512, height: 512 };
    const params3 = { prompt: 'dragon', width: 512, height: 512 };
    
    const hash1 = service.generateCacheHash(params1);
    const hash2 = service.generateCacheHash(params2);
    const hash3 = service.generateCacheHash(params3);
    
    t.equal(hash1, hash2, 'Same params should generate same hash');
    t.notEqual(hash1, hash3, 'Different params should generate different hash');
    t.equal(hash1.length, 64, 'Hash should be 64 characters (SHA256)');
    
    t.end();
  });

  t.test('calls API and processes response', async (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch(),
      apiKey: 'test-gemini-key'
    });
    
    const params = { prompt: 'wizard in purple robes', width: 512, height: 512 };
    const result = await service.generateImage(params);
    
    t.equal(result.operation, 'generate', 'Should detect operation type');
    t.ok(result.base64_image, 'Should return base64 image data');
    t.equal(result.credit_cost, 1, 'Should return credit cost');
    t.ok(result.created_at, 'Should include timestamp');
    
    t.end();
  });

  t.test('handles API errors gracefully', async (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch('error'),
      apiKey: 'test-gemini-key'
    });
    
    const params = { prompt: 'trigger error test', width: 512, height: 512 };
    
    try {
      await service.generateImage(params);
      t.fail('Should have thrown an error');
    } catch (error) {
      t.ok(error.message === 'RATE_LIMITED', 'Should return rate limited error');
    }
    
    t.end();
  });

  t.end();
});

// Cache integration tests
tape('Nano Banana Cache Integration', (t) => {
  t.test('shared cache supports provider separation', (t) => {
    // This test verifies that our shared cache works for nano banana
    const mockDb = {
      query: (sql, params) => {
        if (sql.includes('INSERT INTO image_generations')) {
          // Verify that provider is a parameter (generic design)
          t.ok(params.includes('nanobanana'), 'Should include nanobanana provider');
        }
        return Promise.resolve({ rows: [] });
      }
    };
    
    const cache = createImageGenerationCache({ db: mockDb });
    
    // This should work with our generic design
    cache.storeCachedResult(
      { prompt: 'test wizard', width: 512, height: 512 },
      'test-hash',
      Buffer.from('fake-image-data'),
      1, // userId
      1, // appId  
      'nanobanana' // provider
    );
    
    t.pass('Shared cache supports nano banana provider');
    t.end();
  });

  t.test('cache methods are available', (t) => {
    const mockDb = { query: () => Promise.resolve({ rows: [] }) };
    const cache = createImageGenerationCache({ db: mockDb });
    
    t.ok(typeof cache.getCachedResult === 'function', 'Has getCachedResult method');
    t.ok(typeof cache.storeCachedResult === 'function', 'Has storeCachedResult method');
    t.ok(typeof cache.storeFailedResult === 'function', 'Has storeFailedResult method');
    t.ok(typeof cache.findSimilarCachedResult === 'function', 'Has findSimilarCachedResult method');
    t.ok(typeof cache.getCacheStats === 'function', 'Has getCacheStats method');
    
    t.end();
  });

  t.end();
});

// File processing tests
tape('Nano Banana File Processing', (t) => {
  t.test('processes base64 images correctly', async (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch(),
      apiKey: 'test-gemini-key'
    });
    
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const result = await service.fileToBase64(testImageBase64);
    
    t.equal(result, testImageBase64, 'Should pass through existing base64');
    
    // Test buffer conversion
    const buffer = Buffer.from('test-image-data');
    const bufferResult = await service.fileToBase64(buffer);
    t.ok(bufferResult.startsWith('data:image/png;base64,'), 'Should convert buffer to base64');
    
    t.end();
  });

  t.test('processes form data correctly', async (t) => {
    const service = createNanoBananaService({ 
      fetch: createMockFetch(),
      apiKey: 'test-gemini-key'
    });
    
    const mockFormData = {
      prompt: 'test wizard',
      width: '512',
      height: '512',
      base_image: Buffer.from('fake-image-data')
    };
    
    const result = await service.processFormData(mockFormData);
    
    t.equal(result.prompt, 'test wizard', 'Should copy text fields');
    t.equal(result.width, '512', 'Should preserve string dimensions');
    t.ok(result.base_image_base64.startsWith('data:image/png;base64,'), 'Should convert files to base64');
    
    t.end();
  });

  t.end();
});

// Integration test with existing system
tape('Nano Banana System Integration', (t) => {
  t.test('consistent parameter validation patterns', (t) => {
    const nanoBananaService = createNanoBananaService({ 
      apiKey: 'test',
      fetch: createMockFetch()
    });
    
    // Test that nano banana follows same validation patterns as retrodiffusion
    const validParams = { prompt: 'test', width: 512, height: 512 };
    const errors = nanoBananaService.validateParams(validParams);
    
    t.equal(errors.length, 0, 'Valid params should pass validation');
    
    // Test consistent error message format
    const invalidParams = { prompt: '', width: 0, height: 0 };
    const invalidErrors = nanoBananaService.validateParams(invalidParams);
    
    t.ok(Array.isArray(invalidErrors), 'Should return array of errors');
    t.ok(invalidErrors.every(err => typeof err === 'string'), 'All errors should be strings');
    
    t.end();
  });

  t.test('API request structure matches expected format', async (t) => {
    let capturedRequest;
    const mockFetch = async (url, options) => {
      capturedRequest = { url, options };
      return { ok: true, json: async () => mockSuccessResponse };
    };

    const service = createNanoBananaService({ 
      fetch: mockFetch,
      apiKey: 'test-key'
    });
    
    const params = { prompt: 'test wizard', width: 512, height: 512 };
    await service.generateImage(params);
    
    t.ok(capturedRequest.url.includes('gemini-2.5-flash-image-preview'), 'Should call correct model');
    t.ok(capturedRequest.url.includes('key=test-key'), 'Should include API key');
    t.equal(capturedRequest.options.method, 'POST', 'Should use POST method');
    
    const body = JSON.parse(capturedRequest.options.body);
    t.ok(body.contents, 'Should have contents array');
    t.equal(body.contents[0].parts[0].text, 'test wizard', 'Should include prompt');
    
    t.end();
  });

  t.end();
});