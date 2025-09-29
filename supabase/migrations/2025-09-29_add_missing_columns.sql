-- Add missing physical_items column to packages table
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS physical_items JSONB DEFAULT '[]'::jsonb;

-- Add missing booking_form_template column to profile table
ALTER TABLE public.profile
ADD COLUMN IF NOT EXISTS booking_form_template TEXT;
