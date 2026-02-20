# S3 Setup Guide

## Overview

EduCycle uses AWS S3 exclusively for file storage. All images (listing images, user avatars) are uploaded directly to S3 with automatic optimization and thumbnail generation.

## Prerequisites

1. AWS Account
2. S3 Bucket created
3. IAM User with S3 permissions
4. (Optional) CloudFront distribution for CDN

## AWS Setup Steps

### 1. Create S3 Bucket

1. Go to AWS S3 Console
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `educycle-uploads` (or your preferred name)
   - **Region**: Choose closest region (e.g., `us-east-1`)
   - **Block Public Access**: Uncheck "Block all public access" (we need public read)
   - **Bucket Versioning**: Disable (unless needed)
   - **Default encryption**: Enable (SSE-S3 or SSE-KMS)

### 2. Configure Bucket Policy

Add this bucket policy to allow public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 3. Create CORS Configuration

Add CORS configuration to allow uploads from your frontend:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 4. Create IAM User

1. Go to IAM Console → Users → Create User
2. User name: `educycle-s3-user`
3. Attach policy: `AmazonS3FullAccess` (or create custom policy with minimal permissions)
4. Create access key:
   - Access key type: Application running outside AWS
   - Save Access Key ID and Secret Access Key

### 5. (Optional) Setup CloudFront CDN

1. Create CloudFront distribution
2. Origin: Your S3 bucket
3. Viewer protocol policy: Redirect HTTP to HTTPS
4. Caching: Optimize for performance
5. Note the CloudFront URL for `AWS_CDN_URL`

## Environment Variables

Add to `.env` file:

```env
# AWS S3 Configuration (required)
AWS_REGION=us-east-1
AWS_S3_BUCKET=educycle-uploads
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Optional: CloudFront CDN URL
AWS_CDN_URL=https://d1234567890.cloudfront.net

# File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
```

## Folder Structure in S3

```
your-bucket/
├── listings/
│   ├── 1234567890-image1.jpg
│   ├── 1234567890-image2.jpg
│   └── thumbnails/
│       ├── 1234567890-image1.jpg
│       └── 1234567890-image2.jpg
└── avatars/
    ├── 1234567890-avatar.jpg
    └── ...
```

## API Endpoints

### Upload Listing Images

```http
POST /api/upload/listings/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: [File 1]
- file: [File 2]
- ...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "urls": [
      {
        "url": "https://bucket.s3.region.amazonaws.com/listings/123-image1.jpg",
        "thumbnailUrl": "https://bucket.s3.region.amazonaws.com/listings/thumbnails/123-image1.jpg"
      }
    ]
  }
}
```

### Upload Avatar

```http
POST /api/upload/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: [Avatar Image]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/avatars/123-avatar.jpg"
  }
}
```

### Delete File

```http
DELETE /api/upload/:key
Authorization: Bearer <token>
```

## Image Processing

All images are automatically:
- ✅ Validated (type and size)
- ✅ Resized (listings: max 1200x1200, avatars: 400x400)
- ✅ Optimized (JPEG quality: 85-90%)
- ✅ Thumbnails generated (listings only: 300x300)

## Security

- ✅ File type validation (JPEG, PNG, WebP only)
- ✅ File size limits (10MB max)
- ✅ Authentication required for uploads
- ✅ Automatic filename sanitization
- ✅ Public read access (for images)
- ✅ Private write access (IAM credentials)

## Cost Optimization

1. **Use CloudFront CDN**: Reduces S3 data transfer costs
2. **Enable S3 Lifecycle**: Move old files to Glacier after 90 days
3. **Compress images**: Already handled by Sharp
4. **Use appropriate storage class**: Standard for active files

## Troubleshooting

### Error: "S3 configuration is required"
- Check all AWS environment variables are set
- Verify `.env` file is loaded

### Error: "Access Denied"
- Check IAM user has S3 permissions
- Verify bucket policy allows public read
- Check CORS configuration

### Error: "Invalid file type"
- Only JPEG, PNG, WebP allowed
- Check file extension matches content

### Images not loading
- Verify bucket policy allows public read
- Check CloudFront distribution (if using)
- Verify URLs are correct

## Testing

```bash
# Test S3 connection
curl -X POST http://localhost:3001/api/upload/listings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

## Production Checklist

- [ ] S3 bucket created and configured
- [ ] Bucket policy allows public read
- [ ] CORS configured for frontend domain
- [ ] IAM user created with minimal permissions
- [ ] CloudFront distribution setup (optional)
- [ ] Environment variables set
- [ ] Test upload functionality
- [ ] Monitor S3 costs
- [ ] Setup lifecycle policies
- [ ] Enable S3 access logging
