import { Client, GeocodingRequest, GeocodingResponse, PlaceAutocompleteRequest, PlaceAutocompleteResponse, PlaceDetailsRequest, PlaceDetailsResponse } from '@googlemaps/google-maps-services-js';
import { config } from '../config';

const client = new Client({});

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressComponents: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export interface PlaceAutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetailsResult {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  name?: string;
  addressComponents: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  types?: string[];
}

/**
 * Check if Google Maps API is configured
 */
function isConfigured(): boolean {
  return !!config.googleMaps.apiKey;
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!isConfigured()) {
    throw new Error('Google Maps API key is not configured');
  }

  try {
    const request: GeocodingRequest = {
      params: {
        address,
        key: config.googleMaps.apiKey,
      },
    };

    const response: GeocodingResponse = await client.geocode(request);

    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      return null;
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    // Parse address components
    const addressComponents: GeocodeResult['addressComponents'] = {};
    result.address_components?.forEach((component) => {
      const types = component.types || [];
      if (types.includes('street_number')) {
        addressComponents.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        addressComponents.streetName = component.long_name;
      }
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        addressComponents.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.long_name;
      }
      if (types.includes('country')) {
        addressComponents.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        addressComponents.postalCode = component.long_name;
      }
    });

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      addressComponents,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  if (!isConfigured()) {
    throw new Error('Google Maps API key is not configured');
  }

  try {
    const request: GeocodingRequest = {
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: config.googleMaps.apiKey,
      },
    };

    const response: GeocodingResponse = await client.geocode(request);

    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      return null;
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    // Parse address components
    const addressComponents: GeocodeResult['addressComponents'] = {};
    result.address_components?.forEach((component) => {
      const types = component.types || [];
      if (types.includes('street_number')) {
        addressComponents.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        addressComponents.streetName = component.long_name;
      }
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        addressComponents.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.long_name;
      }
      if (types.includes('country')) {
        addressComponents.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        addressComponents.postalCode = component.long_name;
      }
    });

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      addressComponents,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Search for places using autocomplete
 */
export async function searchPlaces(
  input: string,
  options?: {
    location?: { lat: number; lng: number };
    radius?: number;
    types?: string[];
    components?: string; // e.g., "country:in" for India
  }
): Promise<PlaceAutocompleteResult[]> {
  if (!isConfigured()) {
    throw new Error('Google Maps API key is not configured');
  }

  try {
    const request: PlaceAutocompleteRequest = {
      params: {
        input,
        key: config.googleMaps.apiKey,
        ...(options?.location && { location: `${options.location.lat},${options.location.lng}` }),
        ...(options?.radius && { radius: options.radius }),
        ...(options?.types && { types: options.types }),
        ...(options?.components && { components: options.components }),
      },
    };

    const response: PlaceAutocompleteResponse = await client.placeAutocomplete(request);

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Place autocomplete error: ${response.data.status}`);
    }

    if (!response.data.predictions || response.data.predictions.length === 0) {
      return [];
    }

    return response.data.predictions.map((prediction) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || '',
    }));
  } catch (error) {
    console.error('Place autocomplete error:', error);
    throw error;
  }
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
  if (!isConfigured()) {
    throw new Error('Google Maps API key is not configured');
  }

  try {
    const request: PlaceDetailsRequest = {
      params: {
        place_id: placeId,
        key: config.googleMaps.apiKey,
        fields: ['place_id', 'formatted_address', 'geometry', 'name', 'address_components', 'types'],
      },
    };

    const response: PlaceDetailsResponse = await client.placeDetails(request);

    if (response.data.status !== 'OK' || !response.data.result) {
      return null;
    }

    const result = response.data.result;
    const location = result.geometry?.location;

    if (!location) {
      return null;
    }

    // Parse address components
    const addressComponents: PlaceDetailsResult['addressComponents'] = {};
    result.address_components?.forEach((component) => {
      const types = component.types || [];
      if (types.includes('street_number')) {
        addressComponents.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        addressComponents.streetName = component.long_name;
      }
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        addressComponents.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.long_name;
      }
      if (types.includes('country')) {
        addressComponents.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        addressComponents.postalCode = component.long_name;
      }
    });

    return {
      placeId: result.place_id!,
      formattedAddress: result.formatted_address || '',
      latitude: location.lat,
      longitude: location.lng,
      name: result.name,
      addressComponents,
      types: result.types,
    };
  } catch (error) {
    console.error('Place details error:', error);
    throw error;
  }
}
