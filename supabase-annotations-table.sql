-- PDF Annotations Table for MEDICORE ACADEMY
-- Run this SQL in Supabase SQL Editor

-- Step 1: Drop existing table if needed (WARNING: This will delete existing annotations)
-- Uncomment the next line if you want to start fresh
-- DROP TABLE IF EXISTS pdf_annotations;

-- Step 2: Create the table with page_number support
CREATE TABLE IF NOT EXISTS pdf_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  annotation_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_file_user_page UNIQUE(file_id, user_id, page_number)
);

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pdf_annotations_file_user_page ON pdf_annotations(file_id, user_id, page_number);

-- Step 4: Grant permissions (service_role can do everything)
GRANT ALL ON pdf_annotations TO service_role;
GRANT ALL ON pdf_annotations TO authenticated;

-- Step 5: Add page_number column if table already exists without it
-- Run this if you get an error about missing column:
-- ALTER TABLE pdf_annotations ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;

-- Step 6: Drop old unique constraint and add new one with page_number
-- Run these if you get duplicate key errors:
-- ALTER TABLE pdf_annotations DROP CONSTRAINT IF EXISTS unique_file_user;
-- ALTER TABLE pdf_annotations DROP CONSTRAINT IF EXISTS pdf_annotations_file_id_user_id_key;
-- ALTER TABLE pdf_annotations ADD CONSTRAINT unique_file_user_page UNIQUE(file_id, user_id, page_number);
