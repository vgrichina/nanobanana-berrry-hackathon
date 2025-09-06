const crypto = require('crypto');

/**
 * Cache management for image generation API responses (provider-agnostic)
 * Uses PostgreSQL Large Objects for efficient binary storage
 */
const createImageGenerationCache = (options = {}) => {
  const db = options.db;

  if (!db) {
    throw new Error('Database connection is required for cache');
  }

  /**
   * Check if cached result exists and return binary content
   */
  const getCachedResult = async (cacheHash) => {
    const result = await db.query(`
      SELECT 
        lo_get(content_oid) as content,
        content_type,
        created_at, 
        prompt, 
        style, 
        width, 
        height, 
        provider,
        sha256_hash
      FROM image_generations 
      WHERE cache_hash = $1 AND success = true AND content_oid IS NOT NULL
      LIMIT 1
    `, [cacheHash]);

    return result.rows.length > 0 ? result.rows[0] : null;
  };

  /**
   * Store generation result in cache using LOB storage
   */
  const storeCachedResult = async (params, cacheHash, imageBuffer, userId, appId, provider = 'retrodiffusion', contentType = 'image/png') => {
    // Generate SHA256 hash of image content for deduplication
    const sha256Hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    
    await db.query(`
      INSERT INTO image_generations 
      (user_id, app_id, provider, prompt, style, width, height, seed, remove_bg, tile_x, tile_y, 
       cache_hash, content_oid, content_type, sha256_hash, success, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, lo_from_bytea(0, $13), $14, $15, true, NOW())
      ON CONFLICT (cache_hash) DO UPDATE SET
        content_oid = EXCLUDED.content_oid,
        content_type = EXCLUDED.content_type,
        sha256_hash = EXCLUDED.sha256_hash,
        success = EXCLUDED.success,
        error_message = NULL,
        created_at = EXCLUDED.created_at
    `, [
      userId,
      appId,
      provider,
      params.prompt.trim(),
      params.style,
      parseInt(params.width),
      parseInt(params.height),
      params.seed ? parseInt(params.seed) : null,
      Boolean(params.remove_bg),
      Boolean(params.tile_x),
      Boolean(params.tile_y),
      cacheHash,
      imageBuffer, // Binary buffer for lo_from_bytea
      contentType,
      sha256Hash
    ]);
  };

  /**
   * Store failed generation attempt
   */
  const storeFailedResult = async (params, cacheHash, errorMessage, userId, appId, provider = 'retrodiffusion') => {
    await db.query(`
      INSERT INTO image_generations 
      (user_id, app_id, provider, prompt, style, width, height, seed, remove_bg, tile_x, tile_y,
       cache_hash, success, error_message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, NOW())
      ON CONFLICT (cache_hash) DO UPDATE SET
        success = EXCLUDED.success,
        error_message = EXCLUDED.error_message,
        content_oid = NULL,
        content_type = NULL,
        sha256_hash = NULL,
        created_at = NOW()
    `, [
      userId,
      appId,
      provider,
      params.prompt.trim(),
      params.style,
      parseInt(params.width),
      parseInt(params.height),
      params.seed ? parseInt(params.seed) : null,
      Boolean(params.remove_bg),
      Boolean(params.tile_x),
      Boolean(params.tile_y),
      cacheHash,
      errorMessage
    ]);
  };

  /**
   * Find similar cached results for fallback
   */
  const findSimilarCachedResult = async (params) => {
    // First try to find results with same dimensions but different prompt
    const sameDimensionsResult = await db.query(`
      SELECT lo_get(content_oid) as content, content_type, prompt, created_at
      FROM image_generations 
      WHERE width = $1 AND height = $2 AND style = $3 AND success = true AND content_oid IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `, [parseInt(params.width), parseInt(params.height), params.style]);

    if (sameDimensionsResult.rows.length > 0) {
      return {
        content: sameDimensionsResult.rows[0].content,
        content_type: sameDimensionsResult.rows[0].content_type,
        fallback_type: 'same_dimensions'
      };
    }

    // Fallback to any successful result with same style
    const sameStyleResult = await db.query(`
      SELECT lo_get(content_oid) as content, content_type, prompt, created_at
      FROM image_generations 
      WHERE style = $1 AND success = true AND content_oid IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `, [params.style]);

    if (sameStyleResult.rows.length > 0) {
      return {
        content: sameStyleResult.rows[0].content,
        content_type: sameStyleResult.rows[0].content_type,
        fallback_type: 'same_style'
      };
    }

    return null;
  };

  /**
   * Get cache statistics by provider
   */
  const getCacheStats = async (provider = null) => {
    const whereClause = provider ? 'WHERE provider = $1' : '';
    const params = provider ? [provider] : [];
    
    const result = await db.query(`
      SELECT 
        provider,
        COUNT(*) as total_generations,
        COUNT(*) FILTER (WHERE success = true) as successful_generations,
        COUNT(*) FILTER (WHERE success = false) as failed_generations,
        COUNT(DISTINCT cache_hash) as unique_cache_entries
      FROM image_generations
      ${whereClause}
      GROUP BY provider
      ORDER BY total_generations DESC
    `, params);

    return provider ? (result.rows[0] || null) : result.rows;
  };

  return {
    getCachedResult,
    storeCachedResult,
    storeFailedResult,
    findSimilarCachedResult,
    getCacheStats
  };
};

module.exports = {
  createImageGenerationCache
};