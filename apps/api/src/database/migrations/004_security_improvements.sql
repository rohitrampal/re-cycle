-- Security improvements

-- Add refresh token blacklist table for token revocation
CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
  token_hash VARCHAR(64) PRIMARY KEY, -- SHA-256 hash of token
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_blacklist_expires 
ON refresh_token_blacklist(expires_at);

-- Function to clean expired blacklisted tokens
CREATE OR REPLACE FUNCTION clean_expired_blacklisted_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_token_blacklist 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add rate limiting table (if not using Redis)
CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) NOT NULL,
  count INTEGER DEFAULT 1,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (key, reset_at)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset 
ON rate_limits(reset_at);

-- Function to clean old rate limit records
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE reset_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Add login attempts tracking for brute force protection
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created 
ON login_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created 
ON login_attempts(ip_address, created_at DESC);

-- Function to check if email is locked (too many failed attempts)
CREATE OR REPLACE FUNCTION is_email_locked(email_param VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM login_attempts
  WHERE email = email_param
    AND success = FALSE
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  RETURN failed_count >= 5;
END;
$$ LANGUAGE plpgsql;

-- Add row-level security policies (optional, for multi-tenant)
-- ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY listing_owner_policy ON listings
--   FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
