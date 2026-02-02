# UI Deployment Guide

This document provides instructions for deploying the NutriWealth UI to AWS CloudFront/S3 using GitHub Actions.

## Prerequisites

1. **AWS Account** with necessary permissions
2. **GitHub Repository** with Actions enabled
3. **S3 Bucket** for static hosting
4. **CloudFront Distribution** for CDN
5. **GitHub OIDC Setup** for secure AWS authentication

## AWS Infrastructure Setup

### 1. Create S3 Bucket

```bash
# Create S3 bucket for static hosting
aws s3 mb s3://nutriwealth-ui --region us-east-1

# Block public access (CloudFront will access via OAI)
aws s3api put-public-access-block \
  --bucket nutriwealth-ui \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 2. Create CloudFront Distribution

#### Option A: Using AWS Console

1. Go to **CloudFront** → **Create Distribution**
2. **Origin Settings**:
   - **Origin Domain**: Select your S3 bucket
   - **Origin Access**: Origin Access Identity (OAI) or Origin Access Control (OAC)
   - Create new OAI/OAC if needed
3. **Default Cache Behavior**:
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS
   - **Cache Policy**: CachingOptimized
4. **Settings**:
   - **Price Class**: Use Only North America and Europe (or your preference)
   - **Alternate Domain Names (CNAMEs)**: Add your custom domain if applicable
   - **SSL Certificate**: Default CloudFront Certificate or ACM certificate
   - **Default Root Object**: index.html
5. **Create Distribution**

#### Option B: Using AWS CLI

```bash
# Create CloudFront OAI
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
    CallerReference="nutriwealth-ui-$(date +%s)",Comment="OAI for NutriWealth UI" \
  --query 'CloudFrontOriginAccessIdentity.Id' --output text)

# Create distribution (save to file first for complex JSON)
cat > distribution-config.json <<EOF
{
  "CallerReference": "nutriwealth-ui-$(date +%s)",
  "Comment": "NutriWealth UI Distribution",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-nutriwealth-ui",
        "DomainName": "nutriwealth-ui.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/${OAI_ID}"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-nutriwealth-ui",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }
}
EOF

aws cloudfront create-distribution --distribution-config file://distribution-config.json
```

### 3. Update S3 Bucket Policy

Allow CloudFront OAI to read from S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity YOUR_OAI_ID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nutriwealth-ui/*"
    }
  ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-policy --bucket nutriwealth-ui --policy file://bucket-policy.json
```

### 4. Setup GitHub OIDC Authentication

Run the setup script from the ajna-github-workflows repo:

```bash
# Clone the workflows repo if you haven't already
git clone https://github.com/ajnacloud-ksj/ajna-github-workflows.git

# Run the OIDC setup script
cd ajna-github-workflows
./setup_oidc.sh
```

The role should have these permissions:
- S3 read/write access to your bucket
- CloudFront cache invalidation

Example trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:ajnacloud-ksj/ajna_nutri_wealth_ui_v2:*"
        }
      }
    }
  ]
}
```

Example permissions policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nutriwealth-ui",
        "arn:aws:s3:::nutriwealth-ui/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
    }
  ]
}
```

## GitHub Secrets Configuration

Add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

1. **AWS_ROLE_ARN**
   - The ARN of the GitHub OIDC IAM role
   - Format: `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsRole`

2. **CLOUDFRONT_DISTRIBUTION_ID**
   - Your CloudFront distribution ID
   - Format: `E1234ABCDEFG`
   - Find in AWS Console: CloudFront → Distributions → ID column

3. **VITE_API_URL**
   - Your backend API URL
   - Examples:
     - Lambda Function URL: `https://abc123.lambda-url.us-east-1.on.aws`
     - API Gateway: `https://abc123.execute-api.us-east-1.amazonaws.com/prod`
     - Custom Domain: `https://api.nutriwealth.com`

### Optional Secrets

4. **VITE_TENANT_ID** - Tenant identifier (if needed)
5. **VITE_DEBUG** - Enable debug mode (true/false)

## Workflow Configuration

The deployment workflow is defined in `.github/workflows/deploy-ui.yml`:

```yaml
name: Deploy UI to CloudFront

on:
  push:
    branches: [main]  # Deploy on push to main
  workflow_dispatch:   # Allow manual deployment

jobs:
  deploy:
    uses: ajnacloud-ksj/ajna-github-workflows/.github/workflows/reusable-static-site.yml@main
    with:
      aws-region: 'us-east-1'
      s3-bucket: 'nutriwealth-ui'
      s3-path: ''
      cloudfront-distribution-id: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
      role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
      working-directory: '.'
      node-version: '20'
      api-url: ${{ secrets.VITE_API_URL }}
```

### Customization Options

- **aws-region**: Change to your preferred AWS region
- **s3-bucket**: Must match your S3 bucket name
- **s3-path**: Subdirectory in bucket (leave empty for root)
- **node-version**: Change if you need a different Node version
- **working-directory**: Change if package.json is in a subdirectory

## Deployment Process

### Automatic Deployment

Push to the `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Update UI"
git push origin main
```

### Manual Deployment

Trigger manually from GitHub Actions:

1. Go to **Actions** tab in GitHub
2. Select **Deploy UI to CloudFront** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Deployment Steps (Automated)

The workflow performs these steps:

1. **Checkout code** from the repository
2. **Setup Node.js** (version 20 by default)
3. **Install dependencies** using `npm ci`
4. **Build application** with environment variables
   - `VITE_API_URL` is injected during build
5. **Configure AWS credentials** using OIDC
6. **Sync to S3** using `aws s3 sync` (with --delete flag)
7. **Invalidate CloudFront cache** to serve new content immediately

## Monitoring Deployments

### GitHub Actions

- View deployment status in **Actions** tab
- Check logs for each deployment step
- Review build times and bundle sizes

### AWS Console

- **S3**: Verify files are uploaded correctly
- **CloudFront**: Check invalidation status
- **CloudWatch**: Monitor CloudFront metrics

### AWS CLI

```bash
# List S3 files
aws s3 ls s3://nutriwealth-ui/ --recursive

# Check CloudFront distribution
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# List recent invalidations
aws cloudfront list-invalidations --distribution-id YOUR_DISTRIBUTION_ID

# Get invalidation status
aws cloudfront get-invalidation --distribution-id YOUR_DISTRIBUTION_ID --id INVALIDATION_ID
```

## Testing the Deployment

### 1. Test CloudFront URL

```bash
# Get your CloudFront domain name
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID \
  --query 'Distribution.DomainName' --output text

# Test in browser or with curl
curl https://d1234abcdefg.cloudfront.net
```

### 2. Test Custom Domain (if configured)

```bash
curl https://app.nutriwealth.com
```

### 3. Verify Environment Variables

Open browser DevTools → Console:

```javascript
// Check if API URL is set correctly
console.log(import.meta.env.VITE_API_URL);
```

## Environment Variables

The UI uses Vite environment variables. They must be prefixed with `VITE_`:

### Build-time Variables (set in GitHub Secrets)

- `VITE_API_URL`: Backend API URL (required)
- `VITE_TENANT_ID`: Tenant identifier
- `VITE_DEBUG`: Enable debug logging

### Runtime Variables (not recommended for Vite)

Vite injects environment variables at build time, not runtime. If you need runtime configuration, use a config file served from S3.

## SPA Routing (Important!)

For React Router to work correctly with CloudFront, you need to configure error pages:

### CloudFront Error Pages

1. Go to **CloudFront** → Your Distribution → **Error Pages**
2. Create custom error response:
   - **HTTP Error Code**: 403
   - **Customize Error Response**: Yes
   - **Response Page Path**: /index.html
   - **HTTP Response Code**: 200
3. Repeat for error code 404

This ensures all routes (e.g., `/food`, `/dashboard`) return the React app instead of 404.

## Custom Domain Setup

### 1. Request ACM Certificate

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --domain-name app.nutriwealth.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Validate Certificate

Add DNS validation records to your domain's DNS settings.

### 3. Update CloudFront Distribution

Add alternate domain name (CNAME) and select the ACM certificate.

### 4. Update DNS

Add CNAME record pointing to CloudFront domain:

```
app.nutriwealth.com → d1234abcdefg.cloudfront.net
```

## Troubleshooting

### Deployment Fails: "Bucket does not exist"

Create the S3 bucket:

```bash
aws s3 mb s3://nutriwealth-ui --region us-east-1
```

### Deployment Fails: "Access Denied" on S3

Check that the GitHub OIDC role has S3 permissions:

```bash
aws iam list-role-policies --role-name GitHubActionsRole
aws iam list-attached-role-policies --role-name GitHubActionsRole
```

### CloudFront Serves Old Content

The workflow automatically invalidates cache. If content is still old:

```bash
# Manual invalidation
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Build Fails: "Module not found"

- Check package.json dependencies
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

### Environment Variables Not Working

- Verify secrets are set in GitHub
- Check that variable names start with `VITE_`
- Remember: Vite variables are set at build time, not runtime

### 404 Errors on Refresh

Configure CloudFront error pages (see SPA Routing section above).

## Performance Optimization

### 1. Enable Compression

CloudFront automatically compresses files. Ensure your S3 files have correct content types:

```bash
# Set content type for JS files
aws s3 cp dist/ s3://nutriwealth-ui/ \
  --recursive \
  --exclude "*" \
  --include "*.js" \
  --content-type "application/javascript" \
  --content-encoding "gzip"
```

### 2. Cache Optimization

- Use cache-control headers for assets
- Set long TTL for static assets (images, fonts)
- Set short TTL for HTML files

### 3. Build Optimization

```json
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-*']
        }
      }
    }
  }
})
```

## Cost Optimization

1. **Enable S3 Lifecycle Policies** to delete old versions
2. **Use CloudFront Origin Shield** for high-traffic sites
3. **Choose appropriate Price Class** (All/North America & Europe/North America only)
4. **Monitor CloudFront** data transfer costs

## Best Practices

1. **Use Git Tags** for production releases
2. **Test builds locally** before pushing
3. **Monitor bundle sizes** to prevent bloat
4. **Enable CloudFront logging** for analytics
5. **Set up CloudWatch alarms** for 4xx/5xx errors
6. **Use CDN for assets** (images, fonts)
7. **Implement proper cache strategies**
8. **Enable HTTPS only** (redirect HTTP to HTTPS)

## Rollback

To rollback to a previous version:

### Option 1: Revert Git Commit

```bash
git revert HEAD
git push origin main
# Wait for automatic deployment
```

### Option 2: Manual S3 Upload

```bash
# Build old version locally
git checkout PREVIOUS_COMMIT
npm install
npm run build

# Upload to S3
aws s3 sync dist/ s3://nutriwealth-ui/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [Ajna GitHub Workflows](https://github.com/ajnacloud-ksj/ajna-github-workflows)

## Support

For issues or questions:
- Check GitHub Actions logs
- Review AWS CloudFront access logs
- Contact the DevOps team
