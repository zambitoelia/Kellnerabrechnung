-- Row Level Security Policy für t_user Tabelle
-- Diese SQL-Befehle in Supabase SQL Editor ausführen

-- 1. RLS aktivieren (falls noch nicht aktiviert)
ALTER TABLE t_user ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Jeder angemeldete User kann seinen eigenen Eintrag lesen
-- (notwendig damit der Code prüfen kann ob jemand Admin ist)
CREATE POLICY "Users can read own user data"
ON t_user
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Policy: User kann eigenen Eintrag erstellen (für automatische User-Erstellung)
-- (wird benötigt wenn User sich das erste Mal anmeldet)
CREATE POLICY "Users can insert own user data"
ON t_user
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Prüfen ob die Policies erstellt wurden:
SELECT * FROM pg_policies WHERE tablename = 't_user';

-- Admin-Rechte vergeben:
-- UPDATE t_user SET user_role = 'admin' WHERE user_id = 'deine-user-id-hier';

-- ========================================================================
-- Storage Bucket Policies für Dienstpläne
-- ========================================================================

-- WICHTIG: Bucket "dienstplan" mit Unterordnern:
-- - current_plan/
-- - upcoming_plan/
-- - archive_plan/

-- Im Supabase Dashboard unter Storage > Bucket "dienstplan" > Policies

-- Policy 1: Alle können Dienstpläne lesen (SELECT)
-- Policy Name: "Public read access to dienstplan"
-- Operation: SELECT
-- Policy Definition: true

-- Policy 2: Nur Admins können Dienstpläne hochladen (INSERT)
-- Policy Name: "Admin upload access to dienstplan"
-- Operation: INSERT
-- Policy Definition:
-- (SELECT user_role FROM t_user WHERE user_id = auth.uid()) = 'admin'

-- Policy 3: Nur Admins können Dienstpläne löschen (DELETE)
-- Policy Name: "Admin delete access to dienstplan"
-- Operation: DELETE
-- Policy Definition:
-- (SELECT user_role FROM t_user WHERE user_id = auth.uid()) = 'admin'

-- Policy 4: Nur Admins können Dienstpläne aktualisieren (UPDATE)
-- Policy Name: "Admin update access to dienstplan"
-- Operation: UPDATE
-- Policy Definition:
-- (SELECT user_role FROM t_user WHERE user_id = auth.uid()) = 'admin'
