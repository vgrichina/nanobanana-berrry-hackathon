-- Migration: Add Nano Banana (Gemini 2.5 Flash) support
-- Adds image editing capability to existing image_generations table

-- Add base_image_id column for image editing operations
-- NULL = new generation, NOT NULL = editing existing image
ALTER TABLE image_generations 
ADD COLUMN base_image_id INTEGER REFERENCES image_generations(id);

-- Add index for efficient editing operation lookups
CREATE INDEX idx_image_generations_base_image ON image_generations(base_image_id) 
WHERE base_image_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN image_generations.base_image_id IS 
'Reference to original image for editing operations. NULL for new generations, image ID for edits.';