# S3 Access Denied - Fix Guide

## Root Cause Analysis

You're getting "Access Denied" because one of these is misconfigured:

1. **Block Public Access** is enabled (most common)
2. **Bucket Policy** is missing or incorrect
3. **CloudFront Origin Access** is blocking (if using CloudFront)
4. **IAM Permissions** insufficient for uploads

## Solution: Public Images Setup

### Step 1: Fix S3 Bucket Settings

1. Go to AWS S3 Console → Your Bucket → **Permissions** tab

2. **Block Public Access Settings**:
   - Click "Edit"
   - **UNCHECK all 4 boxes**:
     - ☐ Block all public access
     - ☐ Block public access to buckets and objects granted through new access control lists (ACLs)
     - ☐ Block public access to buckets and objects granted through any access control lists (ACLs)
     - ☐ Block public access to buckets and objects granted through new public bucket or access point policies
   - Click "Save changes"
   - Type "confirm" when prompted

### Step 2: Add Bucket Policy

Go to **Permissions** → **Bucket Policy** → **Edit**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

**Replace `YOUR-BUCKET-NAME` with your actual bucket name.**

### Step 3: If Using CloudFront

If you're using CloudFront (`AWS_CDN_URL` is set), you have two options:

#### Option A: CloudFront with Public Origin (Recommended)

1. CloudFront → Your Distribution → **Origins** tab
2. Edit your S3 origin
3. **Origin Access**: Select "Public" (not OAC/OAI)
4. This allows CloudFront to access public S3 bucket

#### Option B: CloudFront with Origin Access Control (More Secure)

1. Keep S3 bucket **private** (Block Public Access ON)
2. Create Origin Access Control (OAC) in CloudFront
3. Update bucket policy to allow CloudFront OAC:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT-ID:distribution/DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

**Replace:**
- `YOUR-BUCKET-NAME` with your bucket name
- `ACCOUNT-ID` with your AWS account ID
- `DISTRIBUTION-ID` with your CloudFront distribution ID

### Step 4: Verify IAM Permissions

Your IAM user needs these permissions for uploads:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

## Testing

After configuration:

1. **Test direct S3 URL**:
   ```
   https://YOUR-BUCKET.s3.REGION.amazonaws.com/listings/123-image.jpg
   ```
   Should open in browser without authentication.

2. **Test CloudFront URL** (if using):
   ```
   https://YOUR-CDN-URL.cloudfront.net/listings/123-image.jpg
   ```
   Should open in browser.

3. **Test upload via API**:
   ```bash
   curl -X POST http://localhost:3001/api/upload/listings/multiple \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test.jpg"
   ```

## Why Public Images for This Project?

✅ **Marketplace listings are meant to be public** - Anyone should view listing images
✅ **Performance** - Direct browser access, no backend overhead
✅ **Cost-effective** - No signed URL generation overhead
✅ **CDN-friendly** - CloudFront caches public content efficiently
✅ **SEO-friendly** - Search engines can index images

## Security Considerations

Even with public images, you're protected by:

1. **Randomized filenames** - Timestamps prevent enumeration
2. **Authentication required for uploads** - Only logged-in users can upload
3. **File validation** - Type and size restrictions
4. **CloudFront** - Can add signed URLs later if needed for hotlink protection

## Alternative: Signed URLs (If Needed Later)

If you need access control later (e.g., prevent hotlinking), you can switch to signed URLs:

1. Keep bucket private
2. Generate signed URLs when serving listings
3. URLs expire after set time (e.g., 7 days)
4. More complex, but provides access control

**For now, stick with public images** - it's the right choice for a marketplace.
