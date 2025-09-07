#!/usr/bin/env node

/**
 * Download demo apps that use Nano Banana API from production database
 * Creates clean app directories with all files and metadata
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection using BERRRY_PG_URL
const db = new Pool({
  connectionString: process.env.BERRRY_PG_URL
});

// Demo apps that use nanobanana
const DEMO_APPS = [
  'memeyourself',
  'thisfinebanana', 
  'imagemagic'
];

async function downloadDemoApps() {
  console.log('🍌 Downloading Nano Banana demo apps from production...');
  
  const appsDir = './demos/apps';
  await fs.mkdir(appsDir, { recursive: true });
  
  try {
    const demoApps = [];
    
    for (const subdomain of DEMO_APPS) {
      console.log(`📱 Downloading app: ${subdomain}`);
      
      // Get app metadata
      const appQuery = `
        SELECT 
          a.id as app_id,
          a.subdomain,
          a.created_at,
          a.current_version_id
        FROM apps a
        WHERE a.subdomain = $1
      `;
      
      const appResult = await db.query(appQuery, [subdomain]);
      
      if (appResult.rows.length === 0) {
        console.log(`⚠️  App ${subdomain} not found`);
        continue;
      }
      
      const app = appResult.rows[0];
      
      // Get app files
      const filesQuery = `
        SELECT 
          fv.file_name,
          convert_from(lo_get(fb.content_oid), 'UTF8') as content,
          fb.content_type,
          fv.created_at
        FROM file_versions fv
        JOIN file_blobs fb ON fv.sha256_hash = fb.sha256_hash  
        JOIN app_versions av ON fv.app_version_id = av.id
        WHERE av.app_id = $1 AND av.id = $2
        ORDER BY fv.file_name
      `;
      
      const filesResult = await db.query(filesQuery, [app.app_id, app.current_version_id]);
      
      // Check if app actually uses nanobanana
      const usesNanobanana = filesResult.rows.some(file => 
        file.content && file.content.toLowerCase().includes('nanobanana')
      );
      
      if (!usesNanobanana) {
        console.log(`⚠️  App ${subdomain} doesn't use nanobanana, skipping`);
        continue;
      }
      
      // Create app directory
      const appDir = path.join(appsDir, subdomain);
      await fs.mkdir(appDir, { recursive: true });
      
      // Save app files
      const savedFiles = [];
      for (const file of filesResult.rows) {
        if (file.content) {
          const filePath = path.join(appDir, file.file_name);
          
          // Create subdirectories if needed
          const fileDir = path.dirname(filePath);
          await fs.mkdir(fileDir, { recursive: true });
          
          await fs.writeFile(filePath, file.content, 'utf8');
          savedFiles.push({
            name: file.file_name,
            size: file.content.length,
            type: file.content_type,
            created_at: file.created_at
          });
        }
      }
      
      // Count nanobanana API calls in the code
      let nanobananaCalls = 0;
      filesResult.rows.forEach(file => {
        if (file.content) {
          const matches = file.content.match(/\/api\/nanobanana/g);
          nanobananaCalls += matches ? matches.length : 0;
        }
      });
      
      // Save app metadata
      const metadata = {
        subdomain: app.subdomain,
        app_id: app.app_id,
        created_at: app.created_at,
        current_version_id: app.current_version_id,
        live_url: `https://${app.subdomain}.berrry.app`,
        files_count: savedFiles.length,
        files: savedFiles,
        nanobanana_api_calls: nanobananaCalls,
        extracted_at: new Date().toISOString(),
        description: getAppDescription(subdomain)
      };
      
      await fs.writeFile(
        path.join(appDir, 'app-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Create README for the app
      const appReadme = generateAppReadme(metadata);
      await fs.writeFile(path.join(appDir, 'README.md'), appReadme);
      
      demoApps.push(metadata);
      console.log(`✅ Downloaded: ${subdomain} (${savedFiles.length} files, ${nanobananaCalls} API calls)`);
    }
    
    // Create master demo apps index
    const indexContent = generateDemoIndex(demoApps);
    await fs.writeFile(path.join(appsDir, 'README.md'), indexContent);
    
    console.log(`🎉 Downloaded ${demoApps.length} demo apps successfully!`);
    console.log('📁 Files created:');
    demoApps.forEach(app => {
      console.log(`   ${app.subdomain}/ - ${app.files_count} files`);
    });
    
    return demoApps;
    
  } catch (error) {
    console.error('❌ Error downloading demo apps:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

function getAppDescription(subdomain) {
  const descriptions = {
    'memeyourself': 'AI meme generator that puts your face into popular meme templates using Nano Banana API',
    'thisfinebanana': 'Developer humor app generating "This is Fine" style images with banana characters in chaotic scenarios',
    'imagemagic': 'Image generation and editing platform with multiple AI providers including Nano Banana'
  };
  return descriptions[subdomain] || 'Demo app showcasing Nano Banana API integration';
}

function generateAppReadme(metadata) {
  return `# ${metadata.subdomain}.berrry.app

${metadata.description}

## Live Demo
🔗 **[${metadata.subdomain}.berrry.app](${metadata.live_url})**

## App Details
- **Created**: ${new Date(metadata.created_at).toLocaleDateString()}
- **Files**: ${metadata.files_count} files
- **Nano Banana API Calls**: ${metadata.nanobanana_api_calls} references in code

## Files Included
${metadata.files.map(file => `- **${file.name}** (${file.size} bytes)`).join('\n')}

## Nano Banana Integration
This app demonstrates real-world usage of the Nano Banana API for AI image generation. Look for:
- \`/api/nanobanana/image/\` endpoints in the code
- Direct \`<img>\` tag usage for zero-friction integration
- Error handling and fallback strategies

## Usage Pattern
\`\`\`html
<img src="/api/nanobanana/image/512/512?prompt=your+prompt+here" />
\`\`\`

Built for berrry.app - extracted for hackathon demonstration.
`;
}

function generateDemoIndex(demoApps) {
  return `# 🍌 Nano Banana Demo Apps

Real production apps from berrry.app that showcase Nano Banana API integration.

## Live Demo Apps

${demoApps.map(app => `
### [${app.subdomain}.berrry.app](${app.live_url})
${app.description}

- **Files**: ${app.files_count} included
- **API Integration**: ${app.nanobanana_api_calls} nanobanana calls in code
- **Created**: ${new Date(app.created_at).toLocaleDateString()}
- **Code**: [./${app.subdomain}/](./${app.subdomain}/)
`).join('\n')}

## Key Integration Patterns

From analyzing these real apps:

1. **Direct \`<img>\` usage** - Zero JavaScript required
2. **Dynamic URL generation** - JavaScript builds API URLs with user input  
3. **Form data POST** - File uploads with multipart/form-data
4. **Error handling** - Graceful fallbacks when API is unavailable
5. **Caching awareness** - Apps leverage server-side caching

## Quick Start Examples

\`\`\`html
<!-- Simple image generation -->
<img src="/api/nanobanana/image/512/512?prompt=wizard+in+space" />

<!-- Dynamic generation with JavaScript -->
<script>
const prompt = "banana in apocalypse";
const img = document.createElement('img');
img.src = \`/api/nanobanana/image/512/512?prompt=\${encodeURIComponent(prompt)}\`;
document.body.appendChild(img);
</script>
\`\`\`

These apps prove that Nano Banana API works in real production environments with actual users! 🚀
`;
}

if (require.main === module) {
  downloadDemoApps();
}

module.exports = { downloadDemoApps };