-- Update any receipts with 'no-invoice' as invoice_id to NULL
UPDATE receipts
SET invoice_id = NULL
WHERE invoice_id = 'no-invoice';
