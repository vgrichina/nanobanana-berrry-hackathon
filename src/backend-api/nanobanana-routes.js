const Router = require('koa-router');
const { createNanoBananaService } = require('./nanobanana-service');
const { createImageGenerationCache } = require('./image-generation-cache');

/**
 * Handle GET /api/nanobanana/image/:width/:height - direct image generation for <img> tags
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
    style: 'nanobanana',
    type: 'image'
  };

  // Create service and cache instances
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
      ctx.type = cachedResult.content_type || 'image/png';
      ctx.body = cachedResult.content;
      ctx.set('X-Cache-Status', 'HIT');
      ctx.set('X-Generated-At', cachedResult.created_at);
      return;
    }

    // Cache miss - generate new image
    console.log(`[nanobanana] GET generating: ${width}x${height} "${prompt}"`);
    
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
    console.error('[nanobanana] GET generation failed:', error.message);

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
 * Handle POST /api/nanobanana/image - advanced generation with file uploads (redirects to cached URL)
 */
const handleNanoBananaPost = async (ctx) => {
  const service = createNanoBananaService({ fetch: globalThis.fetch });
  const cache = createImageGenerationCache({ db: ctx.db });
  
  try {
    let params;

    // Handle different content types
    if (ctx.is('multipart/form-data')) {
      // Process multipart form data (files + text fields)
      
      // koa-body puts form fields in ctx.request.body and files in ctx.request.files
      params = { ...ctx.request.body };
      const files = ctx.request.files;
      
      // Handle uploaded files for editing
      if (files && files.base_image) {
        const baseImageFile = Array.isArray(files.base_image) ? files.base_image[0] : files.base_image;
        if (baseImageFile && baseImageFile.size > 0) {
          try {
            const fs = require('fs').promises;
            const imageBuffer = await fs.readFile(baseImageFile.filepath);
            params.base_image_base64 = `data:${baseImageFile.mimetype};base64,${imageBuffer.toString('base64')}`;
          } catch (error) {
            console.error('[nanobanana] Failed to process uploaded image:', error);
            ctx.status = 400;
            ctx.body = { error: 'Failed to process uploaded image' };
            return;
          }
        }
      }
      
    } else if (ctx.is('application/json')) {
      // Process JSON with base64 images
      params = ctx.request.body;
    } else {
      ctx.status = 400;
      ctx.body = { error: 'Content-Type must be multipart/form-data or application/json' };
      return;
    }

    // Basic validation
    if (!params.prompt || params.prompt.trim().length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required parameter: prompt' };
      return;
    }

    // Set defaults for missing dimensions and style
    params.width = params.width ? parseInt(params.width) : 512;
    params.height = params.height ? parseInt(params.height) : 512;
    params.prompt = params.prompt.trim();
    params.style = params.style || 'nanobanana';  // Set default style
    params.type = params.type || 'image';         // Set default type

    // Validate parameters
    const errors = service.validateParams(params);
    if (errors.length > 0) {
      ctx.status = 400;
      ctx.body = { error: `Validation failed: ${errors.join(', ')}` };
      return;
    }

    const operation = service.detectOperationType(params);
    const cacheHash = service.generateCacheHash(params);

    // Check cache first
    const cachedResult = await cache.getCachedResult(cacheHash);
    if (cachedResult && cachedResult.content) {
      // Get the image ID from cache result
      const imageResult = await ctx.db.query(`
        SELECT id FROM image_generations 
        WHERE cache_hash = $1 AND success = true AND provider = 'nanobanana'
        ORDER BY created_at DESC
        LIMIT 1
      `, [cacheHash]);

      if (imageResult.rows.length > 0) {
        const imageId = imageResult.rows[0].id;
        ctx.redirect(`/api/nanobanana/image/${imageId}`);
        return;
      }
    }

    // Cache miss - generate new image
    console.log(`[nanobanana] POST ${operation}: ${params.width}x${params.height} "${params.prompt}"`);
    
    const result = await service.generateImage(params);
    const imageBuffer = service.base64ToPngBuffer(result.base64_image);

    // Store in cache and get the generated ID
    
    const userId = ctx.state.user?.id || null;
    const appId = ctx.state.app?.id || null;
    
    const storedResult = await cache.storeCachedResult(
      params, 
      cacheHash, 
      imageBuffer, 
      userId, 
      appId, 
      'nanobanana', 
      'image/png'
    );

    // Redirect to GET endpoint for browser caching
    ctx.redirect(`/api/nanobanana/image/${storedResult.id}`);

  } catch (error) {
    console.error('[nanobanana] POST generation failed:', error.message, error.stack);

    // Return JSON error for POST requests
    if (error.message === 'RATE_LIMITED') {
      ctx.status = 429;
      ctx.body = { success: false, error: 'Rate limited by API provider' };
    } else if (error.message.startsWith('API_ERROR')) {
      ctx.status = 502;
      ctx.body = { success: false, error: 'Image generation service unavailable' };
    } else if (error.message.startsWith('Validation failed')) {
      ctx.status = 400;
      ctx.body = { success: false, error: error.message };
    } else {
      ctx.status = 500;
      ctx.body = { success: false, error: 'Internal server error' };
    }
  }
};

/**
 * Handle GET /api/nanobanana/image/:imageId - serve cached images by ID
 */
const handleNanoBananaImageById = async (ctx) => {
  const { imageId } = ctx.params;

  try {
    const result = await ctx.db.query(`
      SELECT 
        lo_get(content_oid) as content,
        content_type,
        created_at
      FROM image_generations 
      WHERE id = $1 AND success = true AND provider = 'nanobanana'
    `, [parseInt(imageId)]);

    if (result.rows.length === 0) {
      ctx.status = 404;
      ctx.body = { error: 'Image not found' };
      return;
    }

    const row = result.rows[0];
    
    // Set cache headers for browser caching
    ctx.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    ctx.set('ETag', `"nanobanana-${imageId}"`);
    
    ctx.type = row.content_type || 'image/png';
    ctx.body = row.content;

  } catch (error) {
    console.error('[nanobanana] Failed to fetch image by ID:', error.message);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch image' };
  }
};

/**
 * Create Nano Banana routes
 */
const createNanoBananaRoutes = () => {
  const router = new Router();

  // GET endpoints - NO AUTH REQUIRED (for direct <img> tag usage)
  router.get('/api/nanobanana/image/:width/:height', handleNanoBananaImage);
  router.get('/api/nanobanana/image/:imageId', handleNanoBananaImageById);
  
  // POST endpoint - NO AUTH REQUIRED (supports file uploads and redirects)
  router.post('/api/nanobanana/image', handleNanoBananaPost);

  return router;
};

module.exports = {
  createNanoBananaRoutes,
  handleNanoBananaImage,
  handleNanoBananaPost,
  handleNanoBananaImageById
};