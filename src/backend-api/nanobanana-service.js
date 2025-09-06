const crypto = require('crypto');

/**
 * Create image generation service using Google Gemini 2.5 Flash Image as provider
 */
const createNanoBananaService = (options = {}) => {
  const fetch = options.fetch || globalThis.fetch;
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const baseUrl = options.baseUrl || process.env.GEMINI_API_BASE_URL || 
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  /**
   * Generate cache hash for request parameters
   */
  const generateCacheHash = (params) => {
    const normalized = {
      prompt: params.prompt.toLowerCase().trim(),
      width: parseInt(params.width),
      height: parseInt(params.height),
      seed: params.seed ? parseInt(params.seed) : null,
      strength: params.strength ? parseFloat(params.strength) : null,
      preserve_composition: Boolean(params.preserve_composition),
      composition_style: params.composition_style || null,
      type: params.type || 'image',
      has_base_image: Boolean(params.base_image || params.base_image_base64),
      has_reference_images: Boolean(
        (params.reference_images && params.reference_images.length > 0) ||
        (params.reference_images_base64 && params.reference_images_base64.length > 0)
      ),
      reference_count: (params.reference_images?.length || 0) + (params.reference_images_base64?.length || 0)
    };
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  };

  /**
   * Validate request parameters
   */
  const validateParams = (params) => {
    const errors = [];

    if (!params.prompt || params.prompt.trim().length === 0) {
      errors.push('missing_prompt');
    }

    const width = parseInt(params.width);
    const height = parseInt(params.height);
    
    if (isNaN(width) || width < 64 || width > 2048) {
      errors.push('invalid_width');
    }
    
    if (isNaN(height) || height < 64 || height > 2048) {
      errors.push('invalid_height');
    }

    // Validate strength for editing
    if (params.strength !== undefined) {
      const strength = parseFloat(params.strength);
      if (isNaN(strength) || strength < 0.1 || strength > 1.0) {
        errors.push('invalid_strength');
      }
    }

    return errors;
  };

  /**
   * Detect operation type based on parameters
   */
  const detectOperationType = (params) => {
    if (params.base_image || params.base_image_base64) {
      return 'edit';
    }
    if ((params.reference_images && params.reference_images.length > 1) || 
        (params.reference_images_base64 && params.reference_images_base64.length > 1)) {
      return 'compose';
    }
    return 'generate';
  };

  /**
   * Build Gemini API request body
   */
  const buildRequestBody = (params) => {
    const contents = [];
    
    // Add text prompt
    contents.push({ text: params.prompt.trim() });

    // Add base image for editing
    if (params.base_image_base64) {
      const imageData = params.base_image_base64.replace(/^data:image\/[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageData
        }
      });
    }

    // Add reference images for composition
    if (params.reference_images_base64 && params.reference_images_base64.length > 0) {
      params.reference_images_base64.forEach(imageBase64 => {
        const imageData = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: imageData
          }
        });
      });
    }

    const requestBody = {
      contents: [{ parts: contents }],
      generationConfig: {
        ...(params.seed && { seed: parseInt(params.seed) })
      }
    };

    return requestBody;
  };

  /**
   * Call Google Gemini 2.5 Flash Image API
   */
  const generateImage = async (params) => {
    const validation = validateParams(params);
    if (validation.length > 0) {
      throw new Error(`Validation failed: ${validation.join(', ')}`);
    }

    const requestBody = buildRequestBody(params);
    const operationType = detectOperationType(params);

    // Log API call info for debugging
    console.log(`[nanobanana] Generating ${operationType}: ${params.width}x${params.height}`);

    const response = await fetch(`${baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      // Log detailed error response for debugging
      console.log('Gemini API error response:');
      console.log('Status:', response.status);
      console.log('Response body:', errorText);
      console.log('Parsed error data:', errorData);

      if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      
      // Extract error message from various possible formats
      let errorMessage = 'Unknown error';
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
      
      throw new Error(`API_ERROR: ${response.status} - ${errorMessage}`);
    }

    const result = await response.json();
    
    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('API_ERROR: No candidates returned');
    }

    const candidate = result.candidates[0];
    if (!candidate.content?.parts) {
      throw new Error('API_ERROR: No content parts returned');
    }

    // Find the image part
    let base64Image = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error('API_ERROR: No image data returned');
    }

    return {
      base64_image: base64Image,
      operation: operationType,
      credit_cost: 1, // Gemini API doesn't return this, so we estimate
      created_at: new Date().toISOString()
    };
  };

  /**
   * Convert base64 to PNG buffer
   */
  const base64ToPngBuffer = (base64String) => {
    return Buffer.from(base64String, 'base64');
  };

  /**
   * Process file uploads to base64
   */
  const fileToBase64 = async (file) => {
    if (Buffer.isBuffer(file)) {
      return `data:image/png;base64,${file.toString('base64')}`;
    }
    if (typeof file === 'string' && file.startsWith('data:')) {
      return file; // Already base64
    }
    throw new Error('Unsupported file format');
  };

  /**
   * Convert multipart form data to API parameters
   */
  const processFormData = async (formData) => {
    const params = {};
    
    // Copy text fields
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        params[key] = value;
      }
    }

    // Process file uploads
    if (formData.base_image) {
      params.base_image_base64 = await fileToBase64(formData.base_image);
    }

    if (formData.reference_images) {
      const images = Array.isArray(formData.reference_images) ? 
        formData.reference_images : [formData.reference_images];
      params.reference_images_base64 = await Promise.all(
        images.map(img => fileToBase64(img))
      );
    }

    return params;
  };

  return {
    generateImage,
    generateCacheHash,
    validateParams,
    detectOperationType,
    base64ToPngBuffer,
    fileToBase64,
    processFormData
  };
};

module.exports = {
  createNanoBananaService
};