-- Migration: Explicit INSERT policy for ai_providers
-- Date: 2025-08-18
-- Rationale: Existing FOR ALL USING policy lacks WITH CHECK for INSERT; INSERTs were blocked under RLS.

BEGIN;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'ai_providers'
      AND policyname = 'Users can insert own AI providers'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own AI providers" ON public.ai_providers
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)';
  END IF;
END
$policy$;

COMMIT;
