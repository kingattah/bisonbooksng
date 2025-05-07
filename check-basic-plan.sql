-- Check the Basic plan features
SELECT name, features 
FROM subscription_plans 
WHERE name = 'Basic';

-- Update the Basic plan to ensure receipts are unlimited
UPDATE subscription_plans
SET features = features || 
  jsonb_build_object(
    'receipts', 'Unlimited'
  )
WHERE name = 'Basic';

-- Verify the update
SELECT name, features 
FROM subscription_plans 
WHERE name = 'Basic'; 