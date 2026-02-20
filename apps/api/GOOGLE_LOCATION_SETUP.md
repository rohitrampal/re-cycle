# Google Location Services Setup

This project integrates Google Maps API for geocoding, reverse geocoding, and place search functionality.

## Features

- **Geocoding**: Convert addresses to coordinates (latitude/longitude)
- **Reverse Geocoding**: Convert coordinates to formatted addresses
- **Place Autocomplete**: Search for places using Google Places API
- **Place Details**: Get detailed information about a place using Place ID
- **Institution Geocoding**: Automatically geocode institution addresses when creating institutions

## Setup

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Geocoding API**
   - **Places API**
   - **Maps JavaScript API** (if using frontend maps)
4. Create credentials (API Key)
5. Restrict the API key (recommended for production):
   - Application restrictions: HTTP referrers (for frontend) or IP addresses (for backend)
   - API restrictions: Select only the APIs you need

### 2. Configure Environment Variables

Add your Google Maps API key to `apps/api/.env`:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

**Note**: Google Location services are optional. The application will work without them, but geocoding features will be disabled.

## API Endpoints

### Geocoding

Convert an address to coordinates:

```http
GET /api/geocoding/geocode?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA
```

**Response:**
```json
{
  "success": true,
  "data": {
    "latitude": 37.4224764,
    "longitude": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
    "addressComponents": {
      "streetNumber": "1600",
      "streetName": "Amphitheatre Parkway",
      "city": "Mountain View",
      "state": "California",
      "country": "United States",
      "postalCode": "94043"
    }
  }
}
```

### Reverse Geocoding

Convert coordinates to an address:

```http
GET /api/geocoding/reverse-geocode?latitude=37.4224764&longitude=-122.0842499
```

**Response:**
```json
{
  "success": true,
  "data": {
    "latitude": 37.4224764,
    "longitude": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
    "addressComponents": {
      "streetNumber": "1600",
      "streetName": "Amphitheatre Parkway",
      "city": "Mountain View",
      "state": "California",
      "country": "United States",
      "postalCode": "94043"
    }
  }
}
```

### Place Search (Autocomplete)

Search for places:

```http
GET /api/geocoding/places/search?input=Delhi+University&types=school,university&components=country:in
```

**Query Parameters:**
- `input` (required): Search query
- `latitude` (optional): Bias search results to this location
- `longitude` (optional): Bias search results to this location
- `radius` (optional): Search radius in meters
- `types` (optional): Comma-separated place types (e.g., `school,university`)
- `components` (optional): Restrict results (e.g., `country:in` for India)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "placeId": "ChIJ...",
      "description": "University of Delhi, New Delhi, Delhi, India",
      "mainText": "University of Delhi",
      "secondaryText": "New Delhi, Delhi, India"
    }
  ]
}
```

### Place Details

Get detailed information about a place:

```http
GET /api/geocoding/places/{placeId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "placeId": "ChIJ...",
    "formattedAddress": "University of Delhi, New Delhi, Delhi 110007, India",
    "latitude": 28.690587654321,
    "longitude": 77.209021234567,
    "name": "University of Delhi",
    "addressComponents": {
      "city": "New Delhi",
      "state": "Delhi",
      "country": "India",
      "postalCode": "110007"
    },
    "types": ["university", "establishment", "point_of_interest"]
  }
}
```

## Institution Integration

### Create Institution with Geocoding

When creating an institution, you can provide:
- An address (will be geocoded automatically)
- Coordinates directly
- A Google Place ID (will fetch details automatically)

```http
POST /api/institutions
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Delhi University",
  "type": "university",
  "address": "University of Delhi, New Delhi, Delhi, India"
}
```

Or with Place ID:

```json
{
  "name": "Delhi University",
  "type": "university",
  "placeId": "ChIJ..."
}
```

### Search Institutions via Google Places

Search for institutions using Google Places API:

```http
GET /api/institutions/search/places?q=Delhi+University
```

This searches Google Places for educational institutions and returns results that can be used to create institutions.

## Error Handling

If Google Maps API is not configured, endpoints will return:

```json
{
  "success": false,
  "error": {
    "code": "NOT_CONFIGURED",
    "message": "Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables."
  }
}
```

## Rate Limits

Google Maps API has rate limits based on your billing plan:
- **Free tier**: 1,000 requests per day
- **Paid plans**: Higher limits available

Consider implementing caching for frequently accessed locations to reduce API calls.

## Cost Considerations

Google Maps API pricing (as of 2024):
- **Geocoding API**: $5 per 1,000 requests
- **Places API (Autocomplete)**: $2.83 per 1,000 requests
- **Places API (Place Details)**: $17 per 1,000 requests

**Tips to reduce costs:**
1. Cache geocoded addresses
2. Use Place Autocomplete instead of Place Details when possible
3. Implement client-side caching
4. Consider using database-stored coordinates for frequently accessed locations

## Frontend Integration

For frontend integration, you can use the Google Maps JavaScript API directly or use these backend endpoints. The frontend already has Leaflet installed for map display.

Example frontend usage:

```typescript
// Search places
const response = await fetch('/api/geocoding/places/search?input=Delhi+University');
const { data } = await response.json();

// Get place details
const detailsResponse = await fetch(`/api/geocoding/places/${placeId}`);
const { data: placeDetails } = await detailsResponse.json();

// Geocode address
const geocodeResponse = await fetch('/api/geocoding/geocode?address=...');
const { data: location } = await geocodeResponse.json();
```

## Security Best Practices

1. **Restrict API Key**: Use HTTP referrer restrictions for frontend, IP restrictions for backend
2. **Monitor Usage**: Set up billing alerts in Google Cloud Console
3. **Cache Results**: Cache geocoded addresses to reduce API calls
4. **Validate Input**: Always validate and sanitize user input before sending to Google APIs
5. **Error Handling**: Handle API errors gracefully and provide fallbacks

## Troubleshooting

### API Key Not Working
- Verify the API key is correct in `.env`
- Check that required APIs are enabled in Google Cloud Console
- Verify API key restrictions allow your requests

### Geocoding Returns No Results
- Verify the address format is correct
- Check if the location exists in Google's database
- Try a more general address (city, state) if specific address fails

### Rate Limit Errors
- Implement caching to reduce API calls
- Consider upgrading your Google Cloud billing plan
- Monitor usage in Google Cloud Console
