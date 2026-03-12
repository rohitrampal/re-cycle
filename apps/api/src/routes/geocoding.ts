import { FastifyInstance, FastifyRequest } from 'fastify';
import { geocodeAddress, reverseGeocode, searchPlaces, getPlaceDetails } from '../services/google-location.service.js';
import { config } from '../config.js';
import { z } from 'zod';

const geocodeSchema = z.object({
  query: z.object({
    address: z.string().min(1, 'Address is required'),
  }),
});

const reverseGeocodeSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
});

const placeSearchSchema = z.object({
  query: z.object({
    input: z.string().min(1, 'Input is required'),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().positive().optional(),
    types: z.string().optional(), // Comma-separated types
    components: z.string().optional(), // e.g., "country:in"
  }),
});

const placeDetailsSchema = z.object({
  params: z.object({
    placeId: z.string().min(1, 'Place ID is required'),
  }),
});

export default async function geocodingRoutes(fastify: FastifyInstance) {
  // Check if Google Maps API is configured
  const isConfigured = () => !!config.googleMaps.apiKey;

  // Geocode address to coordinates
  fastify.get(
    '/geocode',
    {
      preHandler: [fastify.validate(geocodeSchema)],
    },
    async (request: FastifyRequest) => {
      if (!isConfigured()) {
        return {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.',
          },
        };
      }

      const { address } = request.query as { address: string };

      try {
        const result = await geocodeAddress(address);

        if (!result) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Address not found',
            },
          };
        }

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Geocoding error');
        return {
          success: false,
          error: {
            code: 'GEOCODING_ERROR',
            message: 'Failed to geocode address',
          },
        };
      }
    }
  );

  // Reverse geocode coordinates to address
  fastify.get(
    '/reverse-geocode',
    {
      preHandler: [fastify.validate(reverseGeocodeSchema)],
    },
    async (request: FastifyRequest) => {
      if (!isConfigured()) {
        return {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.',
          },
        };
      }

      const { latitude, longitude } = request.query as { latitude: number; longitude: number };

      try {
        const result = await reverseGeocode(latitude, longitude);

        if (!result) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Location not found',
            },
          };
        }

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Reverse geocoding error');
        return {
          success: false,
          error: {
            code: 'REVERSE_GEOCODING_ERROR',
            message: 'Failed to reverse geocode coordinates',
          },
        };
      }
    }
  );

  // Search places (autocomplete)
  fastify.get(
    '/places/search',
    {
      preHandler: [fastify.validate(placeSearchSchema)],
    },
    async (request: FastifyRequest) => {
      if (!isConfigured()) {
        return {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.',
          },
        };
      }

      const { input, latitude, longitude, radius, types, components } = request.query as {
        input: string;
        latitude?: number;
        longitude?: number;
        radius?: number;
        types?: string;
        components?: string;
      };

      try {
        const options: Parameters<typeof searchPlaces>[1] = {};
        if (latitude !== undefined && longitude !== undefined) {
          options.location = { lat: latitude, lng: longitude };
        }
        if (radius !== undefined) {
          options.radius = radius;
        }
        if (types) {
          options.types = types.split(',').map((t) => t.trim());
        }
        if (components) {
          options.components = components;
        }

        const results = await searchPlaces(input, options);

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Place search error');
        return {
          success: false,
          error: {
            code: 'PLACE_SEARCH_ERROR',
            message: 'Failed to search places',
          },
        };
      }
    }
  );

  // Get place details by place ID
  fastify.get(
    '/places/:placeId',
    {
      preHandler: [fastify.validate(placeDetailsSchema)],
    },
    async (request: FastifyRequest) => {
      if (!isConfigured()) {
        return {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.',
          },
        };
      }

      const { placeId } = request.params as { placeId: string };

      try {
        const result = await getPlaceDetails(placeId);

        if (!result) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Place not found',
            },
          };
        }

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Place details error');
        return {
          success: false,
          error: {
            code: 'PLACE_DETAILS_ERROR',
            message: 'Failed to get place details',
          },
        };
      }
    }
  );
}
