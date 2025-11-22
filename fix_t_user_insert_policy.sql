-- Policy für t_user: User können eigenen Eintrag erstellen
-- Diesen SQL-Befehl in Supabase SQL Editor ausführen

CREATE POLICY "Users can insert own user data"
ON t_user
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Testen ob es funktioniert:
SELECT * FROM pg_policies WHERE tablename = 't_user' AND cmd = 'INSERT';
