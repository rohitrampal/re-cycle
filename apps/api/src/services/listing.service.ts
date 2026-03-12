import { db } from '../database/improved.js';
import { roundForStorage } from '../utils/location.js';

interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  type: string;
  condition: string;
  price?: number;
  images: string[];
  location: { latitude: number; longitude: number } | null;
  institutionId?: string;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ListingService {
  /**
   * Create a new listing
   */
  async create(userId: string, listingData: Omit<Listing, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'views' | 'isActive'>): Promise<Listing> {
    const location = listingData.location
      ? roundForStorage(listingData.location.latitude, listingData.location.longitude)
      : null;
    const result = await db.query(
      `INSERT INTO listings (
        user_id, title, description, category_code, type, condition, 
        price, images, location, institution_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
        CASE WHEN $9::double precision IS NOT NULL AND $10::double precision IS NOT NULL THEN ST_SetSRID(ST_MakePoint($9::double precision, $10::double precision), 4326) ELSE NULL END,
        $11, TRUE)
      RETURNING id, user_id, title, description, category_code, type, condition, price, images,
        institution_id, is_active, views, created_at, updated_at,
        ST_Y(location::geometry) AS location_lat, ST_X(location::geometry) AS location_lng`,
      [
        userId,
        listingData.title,
        listingData.description,
        listingData.category,
        listingData.type,
        listingData.condition,
        listingData.price,
        listingData.images,
        location ? location.longitude : null,
        location ? location.latitude : null,
        listingData.institutionId,
      ]
    );
    return this.mapRowToListing(result.rows[0]);
  }

  /**
   * Get listing by ID with user info
   */
  async getById(listingId: string): Promise<Listing | null> {
    const result = await db.query(
      `SELECT 
        l.id, l.user_id, l.title, l.description, l.category_code, l.type, l.condition,
        l.price, l.images, l.institution_id, l.is_active, l.views, l.created_at, l.updated_at,
        ST_Y(l.location::geometry) AS location_lat, ST_X(l.location::geometry) AS location_lng,
        u.id as user_id, u.name as user_name, u.email as user_email, u.phone as user_phone, u.verified as user_verified
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1 AND l.is_active = TRUE`,
      [listingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToListing(result.rows[0]);
  }

  /**
   * Check if user owns listing
   */
  async isOwner(listingId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      'SELECT user_id FROM listings WHERE id = $1',
      [listingId]
    );

    return result.rows.length > 0 && result.rows[0].user_id === userId;
  }

  /**
   * Map database row to Listing object.
   * Prefer explicit location_lat/location_lng (from ST_Y/ST_X); fallback to GeoJSON coordinates or 0,0.
   */
  private mapRowToListing(row: any): Listing {
    const lat =
      row.location_lat != null
        ? Number(row.location_lat)
        : row.location?.coordinates?.[1] != null
          ? row.location.coordinates[1]
          : null;
    const lng =
      row.location_lng != null
        ? Number(row.location_lng)
        : row.location?.coordinates?.[0] != null
          ? row.location.coordinates[0]
          : null;
    const location =
      lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      category: row.category_code,
      type: row.type,
      condition: row.condition,
      price: row.price ? parseFloat(row.price) : undefined,
      images: row.images || [],
      location,
      institutionId: row.institution_id,
      isActive: row.is_active,
      views: row.views || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const listingService = new ListingService();
