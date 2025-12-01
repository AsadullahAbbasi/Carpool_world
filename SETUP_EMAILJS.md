# Quick Setup: EmailJS Configuration

## The Error You're Seeing

```
EmailJS configuration is missing. Please check your environment variables.
```

This means your `.env.local` file is missing or doesn't have the EmailJS variables.

## Quick Fix (5 minutes)

### Step 1: Create `.env.local` file

In your project root (`post-a-ride` folder), create a file named `.env.local`

### Step 2: Copy this template and fill in your values

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/carpool

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Next.js App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (EmailJS - REQUIRED)
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your-public-key-here
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your-service-id-here
NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID=your-verification-template-id-here
NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID=your-password-reset-template-id-here

# Optional
NEXT_PUBLIC_APP_NAME=Carpool App
```

### Step 3: Get Your EmailJS Credentials

1. **Go to EmailJS Dashboard**: https://www.emailjs.com/
2. **Get Public Key**:
   - Account → General → Copy "Public Key"
   - Paste into `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`

3. **Get Service ID**:
   - Email Services → Your Service → Copy "Service ID"
   - Paste into `NEXT_PUBLIC_EMAILJS_SERVICE_ID`

4. **Get Template IDs**:
   - Email Templates → Your Verification Template → Copy "Template ID"
   - Paste into `NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID`
   
   - Email Templates → Your Password Reset Template → Copy "Template ID"
   - Paste into `NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID`

### Step 4: Restart Your Dev Server

**IMPORTANT:** After creating/updating `.env.local`:

1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`
3. Try signing up again

## Example `.env.local` file

```env
MONGODB_URI=mongodb://localhost:27017/carpool
JWT_SECRET=my-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=abc123xyz789
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123
NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID=template_reset123
NEXT_PUBLIC_APP_NAME=Carpool App
```

## Common Mistakes

❌ **Wrong:** Variables without `NEXT_PUBLIC_` prefix
```env
EMAILJS_PUBLIC_KEY=...  # Won't work in browser!
```

✅ **Correct:** Variables with `NEXT_PUBLIC_` prefix
```env
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=...  # Works!
```

❌ **Wrong:** Forgetting to restart dev server after changing `.env.local`

✅ **Correct:** Always restart dev server after changing environment variables

## Verify It's Working

1. Create `.env.local` with all variables
2. Restart dev server
3. Try signing up
4. Check browser console (F12) - should see: "Verification email sent successfully"
5. Check your email inbox

## Still Having Issues?

Check the browser console for the exact error message. It will now tell you which specific variables are missing!

Example:
```
Missing variables: NEXT_PUBLIC_EMAILJS_PUBLIC_KEY, NEXT_PUBLIC_EMAILJS_SERVICE_ID
```

This tells you exactly what to add to your `.env.local` file.


