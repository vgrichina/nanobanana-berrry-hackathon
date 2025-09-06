# Nano Banana (Gemini 2.5 Flash Image) API Integration

Provider-agnostic image generation API for berrry-server subdomain apps. Integrates with Google's Gemini 2.5 Flash Image (aka "Nano Banana") for high-quality realistic and artistic image generation.

## ✅ v0 Implementation Plan

- **GET-based API**: Direct `<img>` tag compatibility for simple generation
- **POST API**: File upload support for image editing and multi-image composition  
- **PostgreSQL LOB Storage**: Efficient binary data storage with automatic cleanup
- **Aggressive Caching**: Reduces API costs through intelligent cache management
- **Provider-Agnostic Design**: Easy to add new image generation providers
- **Cost Control**: Monitor API usage and implement rate limiting
- **Fallback System**: Apps never break when API is unavailable
- **Credits System**: Share 100 image generation credits per app with retrodiffusion
- **Complete Test Suite**: Mocked API tests for all scenarios

## Image Generation API

### Basic Images (GET - `<img>` tag compatible)
```
GET /api/nanobanana/image/{width}/{height}?prompt=description
```

**Size Constraints**: 
- Standard: 64-2048 pixels for both width and height
- Recommended: 512x512, 768x768, 1024x1024 for best quality

### Advanced Generation (POST - File upload support)
```
POST /api/nanobanana/generate
```

**Supported Operations** (determined by parameters):
- **Basic Generation**: Just prompt + dimensions
- **Image Editing**: prompt + base_image 
- **Multi-Image Composition**: prompt + multiple reference images

### Credits
```
GET /api/credits → {"image_generation": 95}
```

**Usage:**
```html
<img src="/api/nanobanana/image/512/512?prompt=wizard+in+purple+robes+photorealistic" />
```

**Features:** Shared 100 credits per app with retrodiffusion, 1 credit per generation, cached images free, works in `<img>` tags

## Implementation Summary

### Files to Create
```
src/backend-api/
├── nanobanana-service.js           # Google Gemini API client
├── nanobanana-cache.js             # LOB-based cache management  
├── nanobanana-controller.js        # GET endpoint handlers
├── nanobanana-post-controller.js   # POST endpoint handlers
├── nanobanana-routes.js            # Route definitions
└── file-upload-middleware.js       # Multipart form handling

migrations/
└── add_nanobanana_support.sql      # Database schema extensions

tests/
└── nanobanana-endpoints.test.js    # Complete test suite

.env.example                        # Environment configuration
```

## API Usage

### GET Endpoints (No JavaScript Required)

#### Direct HTML Usage
```html
<!-- Basic image generation (uses default style) -->
<img src="/api/nanobanana/image/512/512?prompt=wizard+in+purple+robes" alt="Wizard portrait">

<!-- Specific style -->
<img src="/api/nanobanana/image/768/768/realistic?prompt=modern+office+interior" alt="Office interior">

<!-- Portrait style -->
<img src="/api/nanobanana/image/512/512/portrait?prompt=elderly+wizard+with+long+beard" alt="Wizard portrait">

<!-- Landscape style -->
<img src="/api/nanobanana/image/1024/768/landscape?prompt=fantasy+mountain+landscape+sunset" alt="Mountain landscape">

<!-- Artistic style -->
<img src="/api/nanobanana/image/512/512/artistic?prompt=abstract+geometric+composition" alt="Abstract art">
```

#### CSS Background Usage
```css
.hero-background {
  background-image: url('/api/nanobanana/image/1920/1080/landscape?prompt=cyberpunk+city+skyline+neon+lights');
  background-size: cover;
  background-position: center;
}

.user-avatar {
  background-image: url('/api/nanobanana/image/128/128/portrait?prompt=professional+headshot+business+attire');
  background-size: cover;
  border-radius: 50%;
}
```

### GET URL Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `prompt` | string | ✓ | Description of image to generate | `wizard+in+purple+robes` |
| `seed` | integer | ✗ | Seed for reproducible results | `12345` |
| `style` | string | ✗ | Image generation style | `realistic` |

### POST Endpoints

#### Content Types Supported
- **`multipart/form-data`** - For file uploads
- **`application/json`** - For base64 encoded images

#### Basic Generation
```javascript
// Multipart form
const formData = new FormData();
formData.append('prompt', 'wizard in purple robes');
formData.append('width', '512');
formData.append('height', '512');
formData.append('style', 'realistic');

const response = await fetch('/api/nanobanana/generate', {
  method: 'POST',
  body: formData
});

// JSON with base64 (for reference images)
const response = await fetch('/api/nanobanana/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'wizard in purple robes with mystical background',
    width: 512,
    height: 512,
    style: 'realistic',
    reference_images_base64: ['data:image/png;base64,iVBORw0KGgoAAAA...']
  })
});
```

#### Image Editing
```javascript
// Edit uploaded image
const formData = new FormData();
formData.append('prompt', 'change the walls to blue and add plants');
formData.append('base_image', imageFile);
formData.append('strength', '0.8');

const response = await fetch('/api/nanobanana/generate', {
  method: 'POST',
  body: formData
});

// Edit with base64
const response = await fetch('/api/nanobanana/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'change the walls to blue and add plants',
    base_image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...',
    strength: 0.8
  })
});
```

#### Multi-Image Composition
```javascript
// Combine multiple images
const formData = new FormData();
formData.append('prompt', 'person and dog playing in a park');
formData.append('reference_images', personImage);
formData.append('reference_images', dogImage);
formData.append('composition_style', 'realistic');

const response = await fetch('/api/nanobanana/generate', {
  method: 'POST',
  body: formData
});
```

### POST Parameters

#### Core Parameters
```javascript
{
  // Required
  prompt: "description of desired image",
  
  // Dimensions (required for generation, optional for editing)
  width: 512,
  height: 512,
  
  // Style (optional)  
  style: "realistic" | "artistic" | "portrait" | "landscape" | "interior" | "product" | "default",
  
  // Generation options
  seed: 12345,
  guidance_scale: 7.5,
}
```

#### Image Input Parameters
```javascript
{
  // For editing (single image)
  base_image: File,                    // multipart/form-data
  base_image_base64: "data:...",       // application/json
  
  // For composition (multiple images)  
  reference_images: [File, File],      // multipart/form-data
  reference_images_base64: ["data:...", "data:..."], // application/json
}
```

#### Operation-Specific Parameters
```javascript
{
  // Editing parameters
  strength: 0.8,                      // How much to change (0.1-1.0)
  preserve_composition: true,         // Keep overall layout
  
  // Composition parameters
  composition_style: "realistic",     // Overall style for composition
}
```

### Response Format
```javascript
{
  success: true,
  operation: "generate" | "edit" | "compose",
  
  // Image result
  image_id: "img_abc123",
  image_url: "/api/nanobanana/result/img_abc123.png",
  
  // Credits  
  credits_used: 1,
  credits_remaining: 99,
  
  // Metadata
  dimensions: { width: 512, height: 512 },
  style: "realistic",
  seed_used: 12345,
  created_at: "2025-01-15T10:30:00Z"
}
```

### Dynamic JavaScript Usage
```javascript
// Create image element dynamically
function createNanoBananaImage(prompt, style = 'default', size = 512) {
  const img = document.createElement('img');
  img.src = `/api/nanobanana/image/${size}/${size}/${style}?prompt=${encodeURIComponent(prompt)}`;
  img.alt = prompt;
  return img;
}

// Generate with POST and display result
async function generateAndDisplay(prompt, style = 'realistic') {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('width', '512');
  formData.append('height', '512');
  formData.append('style', style);
  
  const response = await fetch('/api/nanobanana/generate', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  const img = document.createElement('img');
  img.src = result.image_url;
  img.alt = prompt;
  return img;
}

// Usage
document.body.appendChild(createNanoBananaImage('wizard portrait', 'portrait'));
document.body.appendChild(await generateAndDisplay('cyberpunk cityscape', 'landscape'));
```

## Database Schema Extensions

```sql
-- Extend existing image_generations table to support nano banana
ALTER TABLE image_generations ADD COLUMN provider VARCHAR(50) DEFAULT 'retrodiffusion';
ALTER TABLE image_generations ADD COLUMN base_image_id INTEGER REFERENCES image_generations(id);
ALTER TABLE image_generations ADD COLUMN editing_prompt TEXT;
ALTER TABLE image_generations ADD COLUMN upload_method VARCHAR(10) DEFAULT 'GET'; -- 'GET' or 'POST'
ALTER TABLE image_generations ADD COLUMN composition_source_count INTEGER DEFAULT 0;

-- Result images for POST endpoints (temporary storage)
CREATE TABLE generation_results (
    id SERIAL PRIMARY KEY,
    result_id VARCHAR(255) UNIQUE NOT NULL,
    image_id INTEGER REFERENCES image_generations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Cleanup expired results
CREATE INDEX idx_generation_results_expires_at ON generation_results(expires_at);
```

## Cost Controls

- API rate limiting and usage monitoring
- Aggressive caching with fallbacks
- Content deduplication via SHA256
- Smart error handling with retries
- Shared credit pool with retrodiffusion

## Environment Variables

### Required API Keys
- `GEMINI_API_KEY` - Required for Google Gemini 2.5 Flash Image API

### Optional Configuration
- `NANOBANANA_API_BASE_URL` - Override API endpoint (default: Google's official endpoint)
- `MAX_NANOBANANA_CONCURRENT` - Maximum concurrent API calls (default: 2)
- `NANOBANANA_CACHE_TTL` - Cache time-to-live in hours (default: 168 hours / 7 days)

## Future Directions

### v1 Features (Future Implementation)
- **Character Consistency**: Application-level character management system
  - Store character reference images in database
  - Include character references in each generation request  
  - Maintain character descriptions and reuse them
  - Character gallery and management UI

- **Advanced Editing Features**:
  - Inpainting with mask support
  - Style transfer between images
  - Iterative conversation-based editing
  - Batch processing for multiple edits

- **Enhanced Composition**:
  - Smart object placement and scaling
  - Background replacement
  - Multi-stage composition workflows

### Integration with App Generation
- Analyze tweet content and automatically choose appropriate style
- Generate app-specific imagery based on app type and theme
- Create consistent visual themes across generated apps
- Generate app icons and promotional images

## Next Steps

1. **Set GEMINI_API_KEY** in environment
2. **Run migration** to extend database schema: `yarn migrate`
3. **Implement core service** following retrodiffusion patterns
4. **Test integration** with example app
5. **Add POST endpoint** for advanced features

The v0 implementation focuses on core functionality with room for future enhancement!