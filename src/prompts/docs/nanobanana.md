# Nano Banana API (Gemini 2.5 Flash Image)

High-quality image generation using GET and POST requests. Works in `<img>` tags and supports advanced editing.
Use this for realistic, artistic, and high-quality image generation.

## Example URLs

```
/api/nanobanana/image/512/512?prompt=wizard+in+purple+robes+holding+crystal+staff+photorealistic
/api/nanobanana/image/768/512?prompt=fantasy+mountain+landscape+with+castle+cinematic+lighting
/api/nanobanana/image/512/512?prompt=professional+headshot+business+woman+confident+smile+studio+lighting
/api/nanobanana/image/1024/1024?prompt=abstract+geometric+composition+blue+gold+colors+artistic+style
/api/nanobanana/image/512/512?prompt=modern+office+interior+natural+lighting+architectural+photography
/api/nanobanana/image/768/768?prompt=cozy+living+room+fireplace+warm+lighting+interior+design
/api/nanobanana/image/512/512?prompt=sleek+smartphone+on+white+background+studio+lighting+product+photography
/api/nanobanana/image/1920/1080?prompt=cyberpunk+city+skyline+neon+lights+night+cinematic
```

## Endpoints

**Static Images (GET):**
- `/api/nanobanana/image/{width}/{height}?prompt=...`

**Advanced Generation (POST):**
- `POST /api/nanobanana/generate` (supports file uploads, editing, composition)

## Size Guidelines

**Recommended:** 512x512, 768x768, 1024x1024 for best quality
**Size Limits:** 64x64 to 2048x2048 pixels

## GET Parameters

- `prompt` (required): `wizard+in+purple+robes+photorealistic`
- `seed`: `12345` (reproducible results)

## POST Operations

### Basic Generation
```javascript
{
  prompt: "professional headshot business woman studio lighting",
  width: 512,
  height: 512
}
```

### Image Editing (presence of base_image triggers edit mode)
```javascript
{
  prompt: "change the background to a modern office",
  base_image: File, // or base_image_base64
  strength: 0.7     // How much to change (0.1-1.0)
}
```

### Multi-Image Composition
```javascript
{
  prompt: "person working at desk in modern office photorealistic",
  reference_images: [File, File] // or reference_images_base64
}
```

## Prompt Tips

**Good Structure:** `[Subject] + [Action/Pose] + [Setting] + [Style/Mood] + [Technical details]`

Examples:
- `professional businesswoman smiling confidently modern office natural lighting`
- `abstract geometric composition vibrant blue gold colors minimalist style`
- `cozy living room fireplace warm lighting evening atmosphere`