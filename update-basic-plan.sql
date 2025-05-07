-- Update Basic plan features
UPDATE subscription_plans
SET features = jsonb_build_object(
    'receipts', 'Unlimited',
    'estimates', 'Unlimited',
    'clients', 'Unlimited',
    'expenses', 'Unlimited',
    'businesses', 'Unlimited',
    'invoices_per_month', 'Unlimited'
)
WHERE name = 'Basic';

-- Force refresh all active subscriptions
UPDATE subscriptions
SET updated_at = NOW()
WHERE status = 'active';

-- Verify the update
SELECT name, features 
FROM subscription_plans 
WHERE name = 'Basic'; 