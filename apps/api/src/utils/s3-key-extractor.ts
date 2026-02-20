/**
 * Utility to extract S3 key from URL
 * Handles both S3 direct URLs and CDN URLs
 */
export function extractS3KeyFromUrl(url: string, bucketName: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // For S3 direct URLs: https://bucket.s3.region.amazonaws.com/key
    // For CDN URLs: https://cdn.example.com/key
    
    // Extract pathname and remove leading slash
    const pathname = urlObj.pathname;
    if (!pathname || pathname === '/') {
      return null;
    }
    
    // Remove leading slash
    const key = pathname.substring(1);
    
    // If it's an S3 URL, verify bucket name matches
    if (urlObj.hostname.includes('s3') && urlObj.hostname.includes('amazonaws.com')) {
      const hostBucket = urlObj.hostname.split('.')[0];
      if (hostBucket !== bucketName) {
        return null;
      }
    }
    
    return key;
  } catch {
    return null;
  }
}
