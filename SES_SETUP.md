# Amazon SES Setup Guide

This application has been migrated from Mailchimp to Amazon SES for email sending.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Amazon SES Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1

# Keep existing variables for authentication emails (Resend)
RESEND_API_KEY=your_resend_key_here
```

## AWS Setup Steps

### 1. Create AWS Account & IAM User
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** → **Users** → **Create User**
3. Username: `ses-email-sender` (or any name you prefer)
4. Select **Programmatic access**

### 2. Set Permissions
1. Attach policy: **AmazonSESFullAccess**
2. Or create custom policy with minimum permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:GetAccountSendingEnabled",
                "ses:ListVerifiedEmailAddresses",
                "ses:GetSendQuota"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. Get Credentials
1. After user creation, go to **Security credentials** tab
2. Click **Create access key** → **Application running outside AWS**
3. Copy **Access Key ID** and **Secret Access Key**

### 4. Configure SES
1. Go to **Amazon SES** console
2. Select your region (e.g., `us-east-1`)
3. Navigate to **Verified identities**
4. Click **Create identity**

#### Option A: Verify Domain (Recommended)
1. Choose **Domain**
2. Enter: `progenetics1.co.il`
3. Follow DNS configuration instructions
4. Add DKIM records to your DNS

#### Option B: Verify Individual Email
1. Choose **Email address**
2. Enter: `info@progenetics1.co.il`
3. Check email and click verification link

### 5. Request Production Access (Optional)
- By default, SES is in **Sandbox mode**
- Sandbox mode: Can only send to verified addresses
- For production: Request sending limit increase in SES console

## Testing Your Setup

### Step 1: Test Configuration
```bash
curl http://localhost:3000/api/test-ses-config
```

### Step 2: Test SES Connection
```bash
curl http://localhost:3000/api/test-ses
```

### Step 3: Test Email Sending
```bash
curl -X POST http://localhost:3000/api/test-ses-send \
  -H "Content-Type: application/json" \
  -d '{"to": ["your-email@example.com"], "testContent": true}'
```

## Migration Complete! 🎉

### What Changed:
- ✅ Removed Mailchimp Transactional dependencies
- ✅ Added Amazon SES integration
- ✅ Created new test endpoints for SES
- ✅ Updated email sending logic

### New API Endpoints:
- `/api/test-ses-config` - Check SES configuration
- `/api/test-ses` - Test SES connection and permissions
- `/api/test-ses-send` - Send test emails

### Removed Endpoints:
- `/api/test-mailchimp` 
- `/api/test-domains`
- `/api/test-senders`
- `/api/test-ping`
- `/api/check-verified-senders`

## Common Issues & Solutions

### Issue: "Credentials Error"
**Solution:** Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### Issue: "Email address not verified"
**Solution:** Verify your sender email/domain in SES console

### Issue: "Account in sandbox mode" 
**Solution:** Either:
1. Only send to verified addresses, OR
2. Request production access in SES console

### Issue: "Region not found"
**Solution:** Ensure `AWS_REGION` matches your SES region

## Cost Comparison
- **Mailchimp:** Required paid plan for external sending
- **Amazon SES:** $0.10 per 1,000 emails (much cheaper!)

Your email system is now ready with Amazon SES! 🚀
