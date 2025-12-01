# Email Troubleshooting Guide

## Issue: Not Receiving Emails

### Step 1: Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab for errors when signing up or requesting password reset.

**Common Errors:**
- `EmailJS configuration is missing` → Check your `.env.local` file
- `Failed to send verification email: ...` → See error details below

### Step 2: Verify Environment Variables

Make sure your `.env.local` file has ALL these variables with `NEXT_PUBLIC_` prefix:

```env
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your-public-key-here
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your-service-id-here
NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID=your-template-id-here
NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID=your-template-id-here
NEXT_PUBLIC_APP_URL=https://vercel.com/asadullahabbasis-projects/carpool-world/4Y6wV8DXw21YHTQnyg5Q2ZAZP41h
NEXT_PUBLIC_APP_NAME=Carpool App
```

**Important:** 
- Variables MUST start with `NEXT_PUBLIC_` to be accessible in the browser
- Restart your dev server after changing `.env.local`

### Step 3: Check EmailJS Template Configuration

#### In Your EmailJS Dashboard:

1. **Go to Email Templates** → Select your template
2. **Check "To Email" field:**
   - Should contain: `{{email}}` OR `{{to_email}}`
   - Both variable names are now supported in the code

3. **Verify Template Variables Match:**
   - `{{email}}` or `{{to_email}}` - Recipient email
   - `{{verification_url}}` - For verification template
   - `{{reset_url}}` - For password reset template
   - `{{app_name}}` - Your app name

4. **Check Template Settings:**
   - Template must be **Published** (not just saved as draft)
   - Service must be **Active**

### Step 4: Test EmailJS Connection

1. In EmailJS dashboard, go to your template
2. Click **"Test It"** button (top right)
3. Fill in test values:
   - `email`: your-test-email@gmail.com
   - `verification_url`: https://example.com/test
   - `app_name`: Carpool App
4. Click **Send Test Email**
5. Check if you receive the test email

**If test email works but app doesn't:**
- Check browser console for JavaScript errors
- Verify environment variables are loaded (check Network tab)

### Step 5: Check Email Service Limits

1. Go to **Account** → **General**
2. Check **"Requests received"** counter
3. Free tier: 200 emails/month
4. If limit reached, you'll need to upgrade or wait for reset

### Step 6: Check Spam Folder

- Emails might be in Spam/Junk folder
- Check Promotions tab (Gmail)
- Add sender to contacts if needed

### Step 7: Verify EmailJS Service Status

1. Go to **Email Services** → Your service
2. Check if service is **Connected** and **Active**
3. If using Gmail, you might need to:
   - Enable "Less secure app access" (if using personal Gmail)
   - Use App Password (recommended)
   - Or use a different email service

## Issue: Login Works Without Email Verification

**Fixed!** The login route now requires email verification. If you try to login with an unverified email, you'll see:
- Error message: "Email not verified"
- Prompt to check your inbox for verification link

## Common Error Messages

### "EmailJS configuration is missing"
**Solution:** Check your `.env.local` file has all required variables with `NEXT_PUBLIC_` prefix

### "Failed to send verification email: Invalid template ID"
**Solution:** 
- Verify Template ID in `.env.local` matches EmailJS dashboard
- Make sure template is Published (not draft)

### "Failed to send verification email: Invalid service ID"
**Solution:**
- Verify Service ID in `.env.local` matches EmailJS dashboard
- Check service is Active and Connected

### "API calls are disabled for non-browser applications"
**Solution:** This shouldn't happen with `@emailjs/browser`. If it does:
- Make sure you're using `@emailjs/browser` (not `@emailjs/nodejs`)
- Check you're calling email functions from client-side code only

## Debug Checklist

- [ ] All environment variables set with `NEXT_PUBLIC_` prefix
- [ ] Dev server restarted after changing `.env.local`
- [ ] Browser console shows no errors
- [ ] EmailJS template uses correct variable names (`{{email}}` or `{{to_email}}`)
- [ ] Template is Published (not draft)
- [ ] Service is Active and Connected
- [ ] Test email works in EmailJS dashboard
- [ ] Checked spam folder
- [ ] Email service limits not exceeded
- [ ] Browser allows JavaScript (no ad blockers blocking EmailJS)

## Still Not Working?

1. **Check Network Tab:**
   - Open DevTools → Network tab
   - Try signing up
   - Look for failed requests to EmailJS API
   - Check response details

2. **Enable Detailed Logging:**
   - Check browser console for `console.log` messages
   - Should see: "Verification email sent successfully" or error details

3. **Test with EmailJS Playground:**
   - In EmailJS dashboard, use "Playground" feature
   - Test your template directly
   - If playground works but app doesn't, it's a configuration issue

4. **Verify Package Installation:**
   ```bash
   npm list @emailjs/browser
   ```
   Should show version installed

