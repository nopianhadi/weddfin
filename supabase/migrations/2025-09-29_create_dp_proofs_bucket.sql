-- Create the storage bucket for DP proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('dp-proofs', 'dp-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON "storage"."objects"
    AS PERMISSIVE FOR SELECT
    TO public
    USING (bucket_id = 'dp-proofs');
  END IF;
END $$;

-- Allow public (anonymous) users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Enable insert for public users'
  ) THEN
    CREATE POLICY "Enable insert for public users" ON "storage"."objects"
    AS PERMISSIVE FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'dp-proofs');
  END IF;
END $$;
