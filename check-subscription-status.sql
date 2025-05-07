-- Check Basic plan features
SELECT name, features 
FROM subscription_plans 
WHERE name = 'Basic';

-- Check active subscriptions
SELECT 
    s.id as subscription_id,
    s.status,
    s.user_id,
    sp.name as plan_name,
    sp.features
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active';

-- Check receipt count for active users
SELECT 
    u.id as user_id,
    COUNT(r.id) as receipt_count
FROM auth.users u
LEFT JOIN receipts r ON u.id = r.user_id
GROUP BY u.id; 