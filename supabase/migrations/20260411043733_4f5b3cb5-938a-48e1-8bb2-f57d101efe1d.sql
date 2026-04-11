
-- Add Bangladesh-specific pharmacy fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS drug_license_no text;

-- Initialize store_settings with default keys so upsert/update works
INSERT INTO public.store_settings (key, value) VALUES
  ('store_name', 'MediShop'),
  ('store_tagline', 'আপনার বিশ্বস্ত ঔষধের দোকান'),
  ('store_phone', ''),
  ('store_email', ''),
  ('store_address', ''),
  ('store_logo', ''),
  ('currency_symbol', '৳'),
  ('receipt_footer', 'ধন্যবাদ! আবার আসবেন।'),
  ('drug_license_no', '')
ON CONFLICT (key) DO NOTHING;

-- Add unique constraint on store_settings.key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_settings_key_unique'
  ) THEN
    ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_key_unique UNIQUE (key);
  END IF;
END $$;
