import { db } from '../database/improved';

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
  location: { latitude: number; longitude: number };
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
    const result = await db.query(
      `INSERT INTO listings (
        user_id, title, description, category_code, type, condition, 
        price, images, location, institution_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326), $11, TRUE)
      RETURNING *`,
      [
        userId,
        listingData.title,
        listingData.description,
        listingData.category,
        listingData.type,
        listingData.condition,
        listingData.price,
        listingData.images,
        listingData.location.longitude,
        listingData.location.latitude,
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
        l.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.verified as user_verified
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
   * Map database row to Listing object
   */
  private mapRowToListing(row: any): Listing {
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
      location: {
        latitude: row.location?.coordinates?.[1] || 0,
        longitude: row.location?.coordinates?.[0] || 0,
      },
      institutionId: row.institution_id,
      isActive: row.is_active,
      views: row.views || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const listingService = new ListingService();
