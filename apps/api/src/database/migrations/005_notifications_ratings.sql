-- Search alerts: user saves a search to get notified when a matching listing appears in their radius
CREATE TABLE IF NOT EXISTS search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_code VARCHAR(50),
  type VARCHAR(20) CHECK (type IN ('sell', 'rent', 'free')),
  query TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 10 CHECK (radius_km > 0 AND radius_km <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_alerts_user ON search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_location ON search_alerts USING GIST(location);

-- Notifications: in-app notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'listing_match',
  reference_id UUID,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Ratings: one rating per user per listing (1-5 stars, optional comment)
CREATE TABLE IF NOT EXISTS listing_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_ratings_listing ON listing_ratings(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_ratings_user ON listing_ratings(user_id);
