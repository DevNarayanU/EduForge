ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL;

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;

CREATE POLICY "Users can view their own notes or public notes" 
ON public.notes FOR SELECT 
USING (auth.uid() = profile_id OR NOT is_private);
