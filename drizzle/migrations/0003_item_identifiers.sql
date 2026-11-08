-- Split the former generic item_number into category-specific identifiers.
-- Preserve existing card numbers and figure box numbers before adding the new fields.
ALTER TABLE public.items RENAME COLUMN item_number TO box_number;
ALTER TABLE public.items ADD COLUMN item_number text;
ALTER TABLE public.items ADD COLUMN card_number text;

UPDATE public.items
SET card_number = box_number,
    box_number = NULL
WHERE category = '卡片类' AND box_number IS NOT NULL;
