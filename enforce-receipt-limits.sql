-- Create a dedicated function for checking receipt limits
CREATE OR REPLACE FUNCTION enforce_receipt_limit()
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
  
  -- Count existing receipts for this user (excluding the current one if it's an update)
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO current_count
    FROM receipts
    WHERE user_id = user_id_val;
  ELSE
    SELECT COUNT(*) INTO current_count
    FROM receipts
    WHERE user_id = user_id_val
    AND id != NEW.id;
  END IF;
  
  -- Get the plan limit for receipts
  IF plan_features->>'receipts' = 'Unlimited' THEN
    -- Skip limit check for unlimited plans
    RETURN NEW;
  ELSE
    plan_limit := (plan_features->>'receipts')::INTEGER;
  END IF;
  
  -- If we're at or over the limit, raise an exception
  IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
    RAISE EXCEPTION 'Plan limit reached: You can only have % receipts on your current plan.', plan_limit;
  END IF;
  
  -- If we get here, the operation is allowed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a dedicated trigger for receipts
DROP TRIGGER IF EXISTS enforce_receipt_limit_trigger ON receipts;
CREATE TRIGGER enforce_receipt_limit_trigger
BEFORE INSERT ON receipts
FOR EACH ROW
EXECUTE FUNCTION enforce_receipt_limit();
