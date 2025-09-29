-- Add missing package_share_template column to profile table
ALTER TABLE public.profile
ADD COLUMN IF NOT EXISTS package_share_template TEXT;
