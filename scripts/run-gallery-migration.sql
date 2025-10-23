-- Run this script in your Supabase SQL editor to create the galleries table and storage

-- Create galleries table
CREATE TABLE IF NOT EXISTS galleries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    title TEXT NOT NULL,
    region TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    public_id UUID DEFAULT gen_random_uuid() UNIQUE,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'galleries' AND column_name = 'user_id') THEN
        ALTER TABLE galleries ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Remove foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'galleries_user_id_fkey' 
               AND table_name = 'galleries') THEN
        ALTER TABLE galleries DROP CONSTRAINT galleries_user_id_fkey;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_galleries_region ON galleries(region);
CREATE INDEX IF NOT EXISTS idx_galleries_public_id ON galleries(public_id);
CREATE INDEX IF NOT EXISTS idx_galleries_is_public ON galleries(is_public);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON galleries(created_at DESC);

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS (Row Level Security)
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to create galleries
DROP POLICY IF EXISTS "Users can create galleries" ON galleries;
CREATE POLICY "Users can create galleries" ON galleries
    FOR INSERT WITH CHECK (user_id = '2c089b78-266e-4ce1-989c-b8057af79580'::uuid);

-- Policy for users to select their galleries
DROP POLICY IF EXISTS "Users can select galleries" ON galleries;
CREATE POLICY "Users can select galleries" ON galleries
    FOR SELECT USING (user_id = '2c089b78-266e-4ce1-989c-b8057af79580'::uuid);

-- Policy for users to update their galleries
DROP POLICY IF EXISTS "Users can update galleries" ON galleries;
CREATE POLICY "Users can update galleries" ON galleries
    FOR UPDATE USING (user_id = '2c089b78-266e-4ce1-989c-b8057af79580'::uuid);

-- Policy for users to delete their galleries
DROP POLICY IF EXISTS "Users can delete galleries" ON galleries;
CREATE POLICY "Users can delete galleries" ON galleries
    FOR DELETE USING (user_id = '2c089b78-266e-4ce1-989c-b8057af79580'::uuid);

-- Policy for public access to public galleries
DROP POLICY IF EXISTS "Public galleries are viewable by everyone" ON galleries;
CREATE POLICY "Public galleries are viewable by everyone" ON galleries
    FOR SELECT USING (is_public = true);

-- Storage policies for gallery images
DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
CREATE POLICY "Authenticated users can upload gallery images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'gallery-images' AND 
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Authenticated users can update their gallery images" ON storage.objects;
CREATE POLICY "Authenticated users can update their gallery images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'gallery-images' AND 
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Authenticated users can delete their gallery images" ON storage.objects;
CREATE POLICY "Authenticated users can delete their gallery images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'gallery-images' AND 
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Gallery images are publicly viewable" ON storage.objects;
CREATE POLICY "Gallery images are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery-images');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_galleries_updated_at ON galleries;
CREATE TRIGGER update_galleries_updated_at 
    BEFORE UPDATE ON galleries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();