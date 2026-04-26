-- Add icon column to expenses table for category emojis
ALTER TABLE public.expenses
ADD COLUMN icon text;
