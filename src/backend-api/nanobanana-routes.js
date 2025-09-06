const Router = require('koa-router');
const { createNanoBananaService } = require('./nanobanana-service');
const { createImageGenerationCache } = require('./image-generation-cache');

/**
 * Nano Banana image generation middleware
 */
const handleNanoBananaImage = async (ctx) => {
  const { width, height } = ctx.params;
  const { prompt, seed } = ctx.query;

  // Basic validation
  if (!prompt || prompt.trim().length === 0) {
    ctx.status = 400;
    ctx.body = { error: 'Missing required parameter: prompt' };
    return;
  }

  const params = {
    prompt: prompt.trim(),
    width: parseInt(width),
    height: parseInt(height),
    seed: seed ? parseInt(seed) : null,
    style: 'nanobanana',  // Default style for nanobanana provider
    type: 'image'
  };

  // Create service and cache instances with context dependencies
  const service = createNanoBananaService({ fetch: globalThis.fetch });
  const cache = createImageGenerationCache({ db: ctx.db });

  // Validate parameters
  const errors = service.validateParams(params);
  if (errors.length > 0) {
    ctx.status = 400;
    ctx.body = { error: `Validation failed: ${errors.join(', ')}` };
    return;
  }

  const cacheHash = service.generateCacheHash(params);

  try {
    // Check cache first
    const cachedResult = await cache.getCachedResult(cacheHash);
    if (cachedResult && cachedResult.content) {
      // Cache hit - return cached image
      ctx.type = cachedResult.content_type || 'image/png';
      ctx.body = cachedResult.content;
      ctx.set('X-Cache-Status', 'HIT');
      ctx.set('X-Generated-At', cachedResult.created_at);
      return;
    }

    // Cache miss - generate new image
    console.log(`[nanobanana] Cache miss, generating: ${width}x${height} "${prompt}"`);
    
    const result = await service.generateImage(params);
    const imageBuffer = service.base64ToPngBuffer(result.base64_image);

    // Store in cache
    const userId = ctx.state.user?.id || null;
    const appId = ctx.state.app?.id || null;
    
    await cache.storeCachedResult(
      params, 
      cacheHash, 
      imageBuffer, 
      userId, 
      appId, 
      'nanobanana', 
      'image/png'
    );

    // Return generated image
    ctx.type = 'image/png';
    ctx.body = imageBuffer;
    ctx.set('X-Cache-Status', 'MISS');
    ctx.set('X-Operation', result.operation);
    ctx.set('X-Credits-Used', result.credit_cost.toString());

  } catch (error) {
    console.error('[nanobanana] Generation failed:', error.message);

    // Store failed attempt
    const userId = ctx.state.user?.id || null;
    const appId = ctx.state.app?.id || null;
    
    try {
      await cache.storeFailedResult(params, cacheHash, error.message, userId, appId, 'nanobanana');
    } catch (cacheError) {
      console.error('[nanobanana] Failed to store error in cache:', cacheError.message);
    }

    // Try fallback
    const fallback = await cache.findSimilarCachedResult(params);
    if (fallback) {
      console.log('[nanobanana] Using fallback image');
      ctx.type = fallback.content_type || 'image/png';
      ctx.body = fallback.content;
      ctx.set('X-Cache-Status', 'FALLBACK');
      ctx.set('X-Fallback-Type', fallback.fallback_type);
      return;
    }

    // No fallback available
    if (error.message === 'RATE_LIMITED') {
      ctx.status = 429;
      ctx.body = { error: 'Rate limited by API provider' };
    } else if (error.message.startsWith('API_ERROR')) {
      ctx.status = 502;
      ctx.body = { error: 'Image generation service unavailable' };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
  }
};

/**
 * Create Nano Banana routes
 */
const createNanoBananaRoutes = () => {
  const router = new Router();

  // Nano Banana generation endpoints (Gemini 2.5 Flash Image) - NO AUTH REQUIRED
  // These are meant to be used by apps directly (like <img> tags)
  router.get('/api/nanobanana/image/:width/:height', handleNanoBananaImage);

  return router;
};

module.exports = {
  createNanoBananaRoutes,
  handleNanoBananaImage
};