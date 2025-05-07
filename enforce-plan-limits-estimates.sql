-- Create a dedicated function for checking estimate limits
CREATE OR REPLACE FUNCTION enforce_estimate_limit()
RETURNS TRIGGER AS $$
DECLARE
 user_id_val UUID;
 current_count INTEGER;
 plan_limit INTEGER;
 plan_id_val UUID;
 plan_features JSONB;
BEGIN
 -- Get the user_id from the NEW record
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

 -- Count existing estimates for this user (excluding the current one if it's an update)
 IF TG_OP = 'INSERT' THEN
   SELECT COUNT(*) INTO current_count
   FROM estimates
   WHERE user_id = user_id_val;
 ELSE
   SELECT COUNT(*) INTO current_count
   FROM estimates
   WHERE user_id = user_id_val
   AND id != NEW.id;
 END IF;

 -- Get the plan limit for estimates
 IF plan_features->>'estimates' = 'Unlimited' THEN
   plan_limit := 2147483647; -- Max integer value as "unlimited"
 ELSE
   plan_limit := (plan_features->>'estimates')::INTEGER;
 END IF;

 -- If we're at or over the limit, raise an exception
 IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
   RAISE EXCEPTION 'Plan limit reached: You can only have % estimates on your current plan.', plan_limit;
 END IF;

 -- If we get here, the operation is allowed
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a dedicated trigger for estimates
DROP TRIGGER IF EXISTS enforce_estimate_limit_trigger ON estimates;
CREATE TRIGGER enforce_estimate_limit_trigger
BEFORE INSERT ON estimates
FOR EACH ROW
EXECUTE FUNCTION enforce_estimate_limit();
