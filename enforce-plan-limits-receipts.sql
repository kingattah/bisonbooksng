-- Add receipts to the check_plan_limits function
CREATE OR REPLACE FUNCTION check_plan_limits()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  current_count INTEGER;
  plan_limit INTEGER;
  plan_id_val UUID;
  plan_features JSONB;
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
    plan_limit := (plan_features->>'businesses')::INTEGER;
    
    -- If this is an INSERT and we're at or over the limit, raise an exception
    IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
      RAISE EXCEPTION 'Plan limit reached: You can only have % businesses on your current plan.', plan_limit;
    END IF;
  
  ELSIF TG_TABLE_NAME = 'clients' THEN
    -- Count existing clients for this user
    SELECT COUNT(*) INTO current_count
    FROM clients
    WHERE user_id = user_id_val;
    
    -- Get the plan limit for clients
    plan_limit := (plan_features->>'clients')::INTEGER;
    
    -- If this is an INSERT and we're at or over the limit, raise an exception
    IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
      RAISE EXCEPTION 'Plan limit reached: You can only have % clients on your current plan.', plan_limit;
    END IF;
  
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    -- Count existing expenses for this user
    SELECT COUNT(*) INTO current_count
    FROM expenses
    WHERE user_id = user_id_val;
    
    -- Get the plan limit for expenses
    plan_limit := (plan_features->>'expenses')::INTEGER;
    
    -- If this is an INSERT and we're at or over the limit, raise an exception
    IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
      RAISE EXCEPTION 'Plan limit reached: You can only have % expenses on your current plan.', plan_limit;
    END IF;
  
  ELSIF TG_TABLE_NAME = 'invoices' THEN
    -- Count invoices created this month for this user
    SELECT COUNT(*) INTO current_count
    FROM invoices
    WHERE user_id = user_id_val
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
    
    -- Get the plan limit for invoices per month
    plan_limit := (plan_features->>'invoices_per_month')::INTEGER;
    
    -- If this is an INSERT and we're at or over the limit, raise an exception
    IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
      RAISE EXCEPTION 'Plan limit reached: You can only create % invoices per month on your current plan.', plan_limit;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'estimates' THEN
    -- Count existing estimates for this user
    SELECT COUNT(*) INTO current_count
    FROM estimates
    WHERE user_id = user_id_val;
    
    -- Get the plan limit for estimates
    plan_limit := (plan_features->>'estimates')::INTEGER;
    
    -- If this is an INSERT and we're at or over the limit, raise an exception
    IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
      RAISE EXCEPTION 'Plan limit reached: You can only have % estimates on your current plan.', plan_limit;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'receipts' THEN
    -- Count existing receipts for this user
    SELECT COUNT(*) INTO current_count
    FROM receipts
    WHERE user_id = user_id_val;
    
    -- Get the plan limit for receipts
    plan_limit := (plan_features->>'receipts')::INTEGER;
    
    -- If this is an INSERT and we're at or over the limit, raise an exception
    IF TG_OP = 'INSERT' AND current_count >= plan_limit THEN
      RAISE EXCEPTION 'Plan limit reached: You can only have % receipts on your current plan.', plan_limit;
    END IF;
  END IF;
  
  -- If we get here, the operation is allowed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for receipts table if it doesn't exist
CREATE TRIGGER check_receipt_limits
BEFORE INSERT OR UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION check_plan_limits();
