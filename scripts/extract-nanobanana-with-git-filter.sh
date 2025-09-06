#!/bin/bash
set -e

# Extract Nano Banana implementation with git history for hackathon submission
# Uses git filter-repo to preserve commit history for relevant files

BERRRY_REPO_PATH="$(pwd)"
TARGET_DIR="scratch/nanobanana-hackathon"

echo "🍌 Extracting Nano Banana with git history for hackathon..."
echo "Source: $BERRRY_REPO_PATH"
echo "Target: $TARGET_DIR"

# Check if git-filter-repo is available
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo is not installed."
    echo "Install with: pip install git-filter-repo"
    echo "Or use brew: brew install git-filter-repo"
    exit 1
fi

# Clean up existing target
if [ -d "$TARGET_DIR" ]; then
    echo "🧹 Removing existing $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
fi

# Clone the current repo to work with
echo "📋 Cloning repository for filtering..."
git clone . "$TARGET_DIR"
cd "$TARGET_DIR"

# List of paths to keep (nanobanana-related files only)
echo "🔍 Filtering repository to keep only nanobanana-related files..."

git filter-repo \
  --path src/backend-api/nanobanana-service.js \
  --path src/backend-api/nanobanana-routes.js \
  --path src/backend-api/image-generation-cache.js \
  --path migrations/053_add_nanobanana_support.sql \
  --path docs/NANOBANANA_INTEGRATION.md \
  --path src/prompts/docs/nanobanana.md \
  --path tests/nanobanana-integration.test.js \
  --path tests/nanobanana-endpoints.test.js \
  --path test-nanobanana.js \
  --path src/config.js \
  --path src/gemini.js \
  --path tests/utils/db-setup.js \
  --force

echo "✅ Git filtering complete!"

# Create hackathon-specific structure
echo "📁 Creating hackathon directory structure..."
mkdir -p {demos/generated-images,hackathon/screenshots,scripts}

# Move files to better organization
echo "🔄 Reorganizing files for hackathon presentation..."

# Move docs to better locations
if [ -f "docs/NANOBANANA_INTEGRATION.md" ]; then
    mv docs/NANOBANANA_INTEGRATION.md API_REFERENCE.md
fi

if [ -f "src/prompts/docs/nanobanana.md" ]; then
    mkdir -p docs
    mv src/prompts/docs/nanobanana.md docs/ARCHITECTURE.md
    # Clean up empty prompts directory
    rmdir src/prompts/docs 2>/dev/null || true
    rmdir src/prompts 2>/dev/null || true
fi

# Copy this script for reference
cp "$BERRRY_REPO_PATH/scratch/extract-nanobanana-with-git-filter.sh" scripts/

echo "📊 Repository statistics after filtering:"
echo "Commits: $(git rev-list --count HEAD)"
echo "Files: $(find . -type f -not -path './.git/*' | wc -l)"

echo ""
echo "📁 Final structure:"
find . -type f -not -path './.git/*' | sort

echo ""
echo "🎯 Next steps for hackathon submission:"
echo "  1. Create README.md with hackathon pitch"
echo "  2. Extract demo data from production: node scripts/collect-demo-data.js"
echo "  3. Create demo screenshots: node scripts/generate-screenshots.js"
echo "  4. Write DEMO.md walkthrough"
echo "  5. Create hackathon pitch materials in hackathon/"
echo ""
echo "✨ Git history preserved - ready for hackathon showcase!"

# Show recent commits that touch nanobanana files
echo ""
echo "📈 Recent nanobanana development history:"
git log --oneline --graph -10