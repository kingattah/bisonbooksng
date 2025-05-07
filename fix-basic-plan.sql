-- First, check the current Basic plan features
SELECT name, features 
FROM subscription_plans 
WHERE name = 'Basic';

-- Update the Basic plan to ensure receipts are unlimited
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

-- Verify the update
SELECT name, features 
FROM subscription_plans 
WHERE name = 'Basic';

-- Force refresh subscription cache for all users
UPDATE subscriptions
SET updated_at = NOW()
WHERE subscription_plans.name = 'Basic'; 