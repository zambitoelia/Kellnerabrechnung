-- Spalten zur t_stundenzettel Tabelle hinzufügen

-- Spalte für Bild URL
ALTER TABLE t_stundenzettel 
ADD COLUMN IF NOT EXISTS bild_url TEXT;

-- Spalte für Zettel abgegeben Status
ALTER TABLE t_stundenzettel 
ADD COLUMN IF NOT EXISTS zettel_abgegeben BOOLEAN DEFAULT FALSE;

-- Storage Bucket für Bilder erstellen (falls noch nicht vorhanden)
-- Dies muss über die Supabase UI oder Storage API gemacht werden:
-- Bucket Name: stundenzettel-bilder
-- Public: true
-- File size limit: 5MB (oder nach Bedarf)
-- Allowed MIME types: image/jpeg, image/png, image/jpg, image/webp

-- RLS Policy für Storage Bucket (nach Erstellung des Buckets ausführen)
-- Users können nur ihre eigenen Bilder hochladen
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stundenzettel-bilder' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users können nur ihre eigenen Bilder lesen
CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stundenzettel-bilder' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users können nur ihre eigenen Bilder löschen
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stundenzettel-bilder' AND auth.uid()::text = (storage.foldername(name))[1]);
