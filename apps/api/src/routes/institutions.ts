import { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../database/improved.js';
import { searchInstitutionsSchema, createInstitutionSchema } from '../schemas/institution.schema';
import { geocodeAddress, searchPlaces } from '../services/google-location.service';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth';

export default async function institutionRoutes(fastify: FastifyInstance) {
  // Search institutions (database search)
  fastify.get(
    '/search',
    {
      preHandler: [fastify.validate(searchInstitutionsSchema)],
    },
    async (request: FastifyRequest) => {
      const { q } = request.query as { q: string };

      if (!q || q.length < 2) {
        return {
          success: true,
          data: [],
        };
      }

      const result = await db.query(
        `SELECT id, name, type 
         FROM institutions 
         WHERE name ILIKE $1 
         ORDER BY name 
         LIMIT 10`,
        [`%${q}%`]
      );

      return {
        success: true,
        data: result.rows,
      };
    }
  );

  // Search institutions using Google Places API (if configured)
  fastify.get(
    '/search/places',
    {
      preHandler: [fastify.validate(searchInstitutionsSchema)],
    },
    async (request: FastifyRequest) => {
      if (!config.googleMaps.apiKey) {
        return {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.',
          },
        };
      }

      const { q } = request.query as { q: string };

      if (!q || q.length < 2) {
        return {
          success: true,
          data: [],
        };
      }

      try {
        // Search for educational institutions using Google Places
        const places = await searchPlaces(q, {
          types: ['school', 'university'],
          components: 'country:in', // Restrict to India (can be made configurable)
        });

        // Map to institution-like format
        const results = places.map((place) => ({
          placeId: place.placeId,
          name: place.mainText,
          description: place.description,
          secondaryText: place.secondaryText,
        }));

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Places search error');
        return {
          success: false,
          error: {
            code: 'PLACES_SEARCH_ERROR',
            message: 'Failed to search places',
          },
        };
      }
    }
  );

  // Create institution with address geocoding (protected)
  fastify.post(
    '/',
    {
      preHandler: [authenticate, fastify.validate(createInstitutionSchema)],
    },
    async (request: FastifyRequest) => {
      const body = request.body as {
        name: string;
        type: 'school' | 'college' | 'university';
        address?: string;
        latitude?: number;
        longitude?: number;
        placeId?: string; // Google Place ID
      };

      let latitude: number | null = body.latitude ?? null;
      let longitude: number | null = body.longitude ?? null;
      let address: string | null = body.address ?? null;

      // If placeId is provided, get details from Google Places
      if (body.placeId && config.googleMaps.apiKey) {
        try {
          const { getPlaceDetails } = await import('../services/google-location.service');
          const placeDetails = await getPlaceDetails(body.placeId);
          if (placeDetails) {
            latitude = placeDetails.latitude;
            longitude = placeDetails.longitude;
            address = placeDetails.formattedAddress;
          }
        } catch (error) {
          fastify.log.warn({ err: error, placeId: body.placeId }, 'Failed to get place details');
        }
      }

      // If address is provided but no coordinates, geocode it
      if (address && (!latitude || !longitude) && config.googleMaps.apiKey) {
        try {
          const geocodeResult = await geocodeAddress(address);
          if (geocodeResult) {
            latitude = geocodeResult.latitude;
            longitude = geocodeResult.longitude;
            address = geocodeResult.formattedAddress;
          }
        } catch (error) {
          fastify.log.warn({ err: error, address }, 'Failed to geocode address');
        }
      }

      // Insert institution
      const result = await db.query(
        `INSERT INTO institutions (name, type, address, location, verified)
         VALUES ($1, $2, $3, 
           CASE 
             WHEN $4 IS NOT NULL AND $5 IS NOT NULL 
             THEN ST_SetSRID(ST_MakePoint($5, $4), 4326)
             ELSE NULL
           END,
           FALSE)
         RETURNING id, name, type, address, verified, created_at`,
        [body.name, body.type, address, latitude, longitude]
      );

      return {
        success: true,
        data: result.rows[0],
      };
    }
  );
}
