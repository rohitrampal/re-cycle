-- Performance optimization indexes

-- Composite index for common listing queries (category + active + created)
CREATE INDEX IF NOT EXISTS idx_listings_category_active_created 
ON listings(category_code, is_active, created_at DESC) 
WHERE is_active = TRUE;

-- Composite index for user listings
CREATE INDEX IF NOT EXISTS idx_listings_user_active 
ON listings(user_id, is_active, created_at DESC);

-- Partial index for active listings with location
CREATE INDEX IF NOT EXISTS idx_listings_active_location 
ON listings USING GIST(location) 
WHERE is_active = TRUE AND location IS NOT NULL;

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_listings_price 
ON listings(price) 
WHERE price IS NOT NULL AND is_active = TRUE;

-- Composite index for search (type + condition + price)
CREATE INDEX IF NOT EXISTS idx_listings_type_condition_price 
ON listings(type, condition, price) 
WHERE is_active = TRUE;

-- Index for institution-based queries
CREATE INDEX IF NOT EXISTS idx_listings_institution_active 
ON listings(institution_id, is_active, created_at DESC) 
WHERE institution_id IS NOT NULL;

-- Index for contact logs by listing (for analytics)
CREATE INDEX IF NOT EXISTS idx_contact_logs_listing_created 
ON contact_logs(listing_id, created_at DESC);

-- Index for user verification status
CREATE INDEX IF NOT EXISTS idx_users_verified 
ON users(verified) 
WHERE verified = TRUE;

-- Index for users with location (for nearby queries)
CREATE INDEX IF NOT EXISTS idx_users_location_active 
ON users USING GIST(location) 
WHERE location IS NOT NULL;
