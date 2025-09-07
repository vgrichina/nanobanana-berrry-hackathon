# 🍌 Nano Banana Demo Apps

Real production apps from berrry.app that showcase Nano Banana API integration.

## Live Demo Apps


### [memeyourself.berrry.app](https://memeyourself.berrry.app)
AI meme generator that puts your face into popular meme templates using Nano Banana API

- **Files**: 4 included
- **API Integration**: 1 nanobanana calls in code
- **Created**: 9/6/2025
- **Code**: [./memeyourself/](./memeyourself/)


### [thisfinebanana.berrry.app](https://thisfinebanana.berrry.app)
Developer humor app generating "This is Fine" style images with banana characters in chaotic scenarios

- **Files**: 4 included
- **API Integration**: 1 nanobanana calls in code
- **Created**: 9/6/2025
- **Code**: [./thisfinebanana/](./thisfinebanana/)


### [imagemagic.berrry.app](https://imagemagic.berrry.app)
Image generation and editing platform with multiple AI providers including Nano Banana

- **Files**: 4 included
- **API Integration**: 3 nanobanana calls in code
- **Created**: 9/6/2025
- **Code**: [./imagemagic/](./imagemagic/)


## Key Integration Patterns

From analyzing these real apps:

1. **Direct `<img>` usage** - Zero JavaScript required
2. **Dynamic URL generation** - JavaScript builds API URLs with user input  
3. **Form data POST** - File uploads with multipart/form-data
4. **Error handling** - Graceful fallbacks when API is unavailable
5. **Caching awareness** - Apps leverage server-side caching

## Quick Start Examples

```html
<!-- Simple image generation -->
<img src="/api/nanobanana/image/512/512?prompt=wizard+in+space" />

<!-- Dynamic generation with JavaScript -->
<script>
const prompt = "banana in apocalypse";
const img = document.createElement('img');
img.src = `/api/nanobanana/image/512/512?prompt=${encodeURIComponent(prompt)}`;
document.body.appendChild(img);
</script>
```

These apps prove that Nano Banana API works in real production environments with actual users! 🚀
