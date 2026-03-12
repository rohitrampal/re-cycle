/**
 * Notifications: create in-app notifications when new listings match a user's search alert (within radius).
 */

import { db } from '../database/improved.js';

export interface NewListingForMatch {
  id: string;
  user_id: string;
  title: string;
  category_code: string | null;
  type: string;
  location: unknown; // PostGIS geography
}

/**
 * Find search alerts that match this listing (category/type) and whose alert location is within radius of the listing.
 * Notify those users (excluding the listing owner).
 */
export async function notifyMatchingSearchAlerts(
  listing: NewListingForMatch,
  listingLon: number,
  listingLat: number
): Promise<void> {
  const result = await db.query(
    `SELECT sa.id, sa.user_id, sa.radius_km
     FROM search_alerts sa
     WHERE sa.user_id != $1
       AND ST_DWithin(
             sa.location::geography,
             ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
             sa.radius_km * 1000
           )
       AND (sa.category_code IS NULL OR sa.category_code = $4)
       AND (sa.type IS NULL OR sa.type = $5)
     ORDER BY sa.user_id`,
    [listing.user_id, listingLon, listingLat, listing.category_code ?? '', listing.type]
  );

  const seen = new Set<string>();
  for (const row of result.rows) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    await db.query(
      `INSERT INTO notifications (user_id, type, reference_id, title, message, created_at)
       VALUES ($1, 'listing_match', $2, $3, $4, NOW())`,
      [
        row.user_id,
        listing.id,
        'New listing near you',
        `"${(listing.title || '').slice(0, 50)}" matches your saved search.`,
      ]
    );
  }
}
