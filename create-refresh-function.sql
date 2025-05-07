-- Create a function to refresh subscription cache
CREATE OR REPLACE FUNCTION refresh_subscription_cache(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update the updated_at timestamp on the subscription to force cache invalidation
  UPDATE subscriptions
  SET updated_at = NOW()
  WHERE user_id = $1;
END;
$$ LANGUAGE plpgsql;
