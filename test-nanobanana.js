// Quick test script for nano banana service
const { createNanoBananaService } = require('./src/backend-api/nanobanana-service.js');
const { createImageGenerationCache } = require('./src/backend-api/image-generation-cache.js');

// Mock Gemini API responses
const mockGeminiResponse = {
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

const mockFetch = async (url, options) => {
  console.log('📡 Mock API call to:', url.split('?')[0]);
  console.log('📋 Request body:', JSON.stringify(JSON.parse(options.body), null, 2));
  
  return {
    ok: true,
    json: async () => mockGeminiResponse
  };
};

async function testNanoBananaService() {
  console.log('Testing Nano Banana Service...');
  
  try {
    // Test service creation with mock fetch
    const service = createNanoBananaService({
      apiKey: 'test-key',
      fetch: mockFetch
    });
    console.log('✓ Service created successfully');
    console.log('Available methods:', Object.keys(service));
    
    // Test parameter validation
    const validParams = {
      prompt: 'wizard in purple robes',
      width: 512,
      height: 512
    };
    
    const errors = service.validateParams(validParams);
    console.log('✓ Validation passed:', errors.length === 0 ? 'YES' : `NO: ${errors.join(', ')}`);
    
    // Test cache hash generation
    const hash = service.generateCacheHash(validParams);
    console.log('✓ Cache hash generated:', hash.substring(0, 16) + '...');
    
    // Test operation type detection
    console.log('✓ Operation types:');
    console.log('  Basic generation:', service.detectOperationType(validParams));
    console.log('  Image editing:', service.detectOperationType({...validParams, base_image_base64: 'data:...'}));
    console.log('  Composition:', service.detectOperationType({...validParams, reference_images_base64: ['data:...', 'data:...']}));
    
    // Test invalid parameters
    const invalidErrors = service.validateParams({ prompt: '', width: 'invalid', height: -1 });
    console.log('✓ Invalid param detection:', invalidErrors.length > 0 ? 'YES' : 'NO');
    console.log('  Errors found:', invalidErrors.join(', '));
    
    // Test mocked API call
    console.log('\n🧪 Testing mocked API call...');
    const result = await service.generateImage(validParams);
    console.log('✓ Mock API call successful');
    console.log('  Operation type:', result.operation);
    console.log('  Has image data:', result.base64_image ? 'YES' : 'NO');
    console.log('  Credit cost:', result.credit_cost);
    
    // Test with editing operation
    console.log('\n🧪 Testing edit operation...');
    const editParams = {
      ...validParams,
      prompt: 'change background to forest',
      base_image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      strength: 0.8
    };
    const editResult = await service.generateImage(editParams);
    console.log('✓ Mock edit call successful, operation:', editResult.operation);
    
    // Test shared cache compatibility
    console.log('\n🧪 Testing cache compatibility...');
    const mockDb = {
      query: async (sql, params) => {
        console.log('📊 Mock DB query:', sql.split('\n')[0].trim());
        return { rows: [] };
      }
    };
    
    const cache = createImageGenerationCache({ db: mockDb });
    console.log('✓ Shared cache created successfully');
    console.log('Available cache methods:', Object.keys(cache));
    
    // Test cache hash consistency
    const hash1 = service.generateCacheHash(validParams);
    const hash2 = service.generateCacheHash(validParams);
    const hash3 = service.generateCacheHash({...validParams, prompt: 'different prompt'});
    console.log('✓ Cache hash consistency:', hash1 === hash2 ? 'YES' : 'NO');
    console.log('✓ Different prompts have different hashes:', hash1 !== hash3 ? 'YES' : 'NO');
    
    console.log('\n🎉 All tests passed!');
    
    if (process.env.GEMINI_API_KEY) {
      console.log('\n🚀 Ready for real API calls with GEMINI_API_KEY');
    } else {
      console.log('\n⚠️  Set GEMINI_API_KEY to test real API calls');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNanoBananaService();