-- Update the database-level plan limit enforcement for estimates and receipts

-- First, let's fix the check_plan_limits function to properly handle "Unlimited" values
CREATE OR REPLACE FUNCTION check_plan_limits()
RETURNS TRIGGER AS $$
DECLARE
 user_id_val UUID;
 current_count INTEGER;
 plan_limit INTEGER;
 plan_id_val UUID;
 plan_features JSONB;
 limit_value TEXT;
BEGIN
 -- Get the user_id from the NEW record or from the session
 user_id_val := NEW.user_id;
 
 -- Get the user's subscription plan
 SELECT plan_id INTO plan_id_val
 FROM subscriptions
 WHERE user_id = user_id_val
 AND status = 'active'
 LIMIT 1;
 
 -- If no active subscription, use default free plan
 IF plan_id_val IS NULL THEN
   SELECT id INTO plan_id_val
   FROM subscription_plans
   WHERE name = 'Free'
   LIMIT 1;
 END IF;
 
 -- Get the plan features
 SELECT features INTO plan_features
 FROM subscription_plans
 WHERE id = plan_id_val;
 
 -- Check which table we're operating on and enforce the appropriate limit
 IF TG_TABLE_NAME = 'businesses' THEN
   -- Count existing businesses for this user
   SELECT COUNT(*) INTO current_count
   FROM businesses
   WHERE user_id = user_id_val;
   
   -- Get the plan limit for businesses
   limit_value := plan_features->>'businesses';
   
   -- Handle "Unlimited" case
   IF limit_value = 'Unlimited' THEN
     plan_limit := 2147483647; -- Max integer as "unlimited"
   ELSE
     plan_limit := (limit_value)::INTEGER;
   END IF;
   
   -- If this is an INSERT and we're at or over the limit, raise an exception
   IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
     RAISE EXCEPTION 'Plan limit reached: You can only have % businesses on your current plan.', 
       CASE WHEN limit_value = 'Unlimited' THEN 'unlimited' ELSE limit_value END;
   END IF;
 
 ELSIF TG_TABLE_NAME = 'clients' THEN
   -- Count existing clients for this user
   SELECT COUNT(*) INTO current_count
   FROM clients
   WHERE user_id = user_id_val;
   
   -- Get the plan limit for clients
   limit_value := plan_features->>'clients';
   
   -- Handle "Unlimited" case
   IF limit_value = 'Unlimited' THEN
     plan_limit := 2147483647; -- Max integer as "unlimited"
   ELSE
     plan_limit := (limit_value)::INTEGER;
   END IF;
   
   -- If this is an INSERT and we're at or over the limit, raise an exception
   IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
     RAISE EXCEPTION 'Plan limit reached: You can only have % clients on your current plan.', 
       CASE WHEN limit_value = 'Unlimited' THEN 'unlimited' ELSE limit_value END;
   END IF;
 
 ELSIF TG_TABLE_NAME = 'expenses' THEN
   -- Count existing expenses for this user
   SELECT COUNT(*) INTO current_count
   FROM expenses
   WHERE user_id = user_id_val;
   
   -- Get the plan limit for expenses
   limit_value := plan_features->>'expenses';
   
   -- Handle "Unlimited" case
   IF limit_value = 'Unlimited' THEN
     plan_limit := 2147483647; -- Max integer as "unlimited"
   ELSE
     plan_limit := (limit_value)::INTEGER;
   END IF;
   
   -- If this is an INSERT and we're at or over the limit, raise an exception
   IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
     RAISE EXCEPTION 'Plan limit reached: You can only have % expenses on your current plan.', 
       CASE WHEN limit_value = 'Unlimited' THEN 'unlimited' ELSE limit_value END;
   END IF;
 
 ELSIF TG_TABLE_NAME = 'invoices' THEN
   -- Count invoices created this month for this user
   SELECT COUNT(*) INTO current_count
   FROM invoices
   WHERE user_id = user_id_val
   AND created_at >= date_trunc('month', CURRENT_DATE)
   AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
   
   -- Get the plan limit for invoices per month
   limit_value := plan_features->>'invoices_per_month';
   
   -- Handle "Unlimited" case
   IF limit_value = 'Unlimited' THEN
     plan_limit := 2147483647; -- Max integer as "unlimited"
   ELSE
     plan_limit := (limit_value)::INTEGER;
   END IF;
   
   -- If this is an INSERT and we're at or over the limit, raise an exception
   IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
     RAISE EXCEPTION 'Plan limit reached: You can only create % invoices per month on your current plan.', 
       CASE WHEN limit_value = 'Unlimited' THEN 'unlimited' ELSE limit_value END;
   END IF;
   
 ELSIF TG_TABLE_NAME = 'estimates' THEN
   -- Count existing estimates for this user
   SELECT COUNT(*) INTO current_count
   FROM estimates
   WHERE user_id = user_id_val;
   
   -- Get the plan limit for estimates
   limit_value := plan_features->>'estimates';
   
   -- Handle "Unlimited" case
   IF limit_value = 'Unlimited' THEN
     plan_limit := 2147483647; -- Max integer as "unlimited"
   ELSE
     plan_limit := (limit_value)::INTEGER;
   END IF;
   
   -- If this is an INSERT and we're at or over the limit, raise an exception
   IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
     RAISE EXCEPTION 'Plan limit reached: You can only have % estimates on your current plan.', 
       CASE WHEN limit_value = 'Unlimited' THEN 'unlimited' ELSE limit_value END;
   END IF;
   
 ELSIF TG_TABLE_NAME = 'receipts' THEN
   -- Count existing receipts for this user
   SELECT COUNT(*) INTO current_count
   FROM receipts
   WHERE user_id = user_id_val;
   
   -- Get the plan limit for receipts
   limit_value := plan_features->>'receipts';
   
   -- Handle "Unlimited" case
   IF limit_value = 'Unlimited' THEN
     plan_limit := 2147483647; -- Max integer as "unlimited"
   ELSE
     plan_limit := (limit_value)::INTEGER;
   END IF;
   
   -- If this is an INSERT and we're at or over the limit, raise an exception
   IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
     RAISE EXCEPTION 'Plan limit reached: You can only have % receipts on your current plan.', 
       CASE WHEN limit_value = 'Unlimited' THEN 'unlimited' ELSE limit_value END;
   END IF;
 END IF;
 
 -- If we get here, the operation is allowed
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to refresh subscription cache
CREATE OR REPLACE FUNCTION refresh_subscription_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- When a subscription is updated, invalidate any cached plan data
  PERFORM pg_notify('subscription_updated', NEW.user_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to refresh cache when subscriptions are updated
DROP TRIGGER IF EXISTS refresh_subscription_cache_trigger ON subscriptions;
CREATE TRIGGER refresh_subscription_cache_trigger
AFTER UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION refresh_subscription_cache();
