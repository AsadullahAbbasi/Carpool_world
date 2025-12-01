/**
 * Client-side EmailJS utility
 * Sends emails from the browser using EmailJS
 */

import emailjs from '@emailjs/browser';

// Initialize EmailJS with public key
const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
if (publicKey) {
  emailjs.init(publicKey);
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID;

  // Check which variables are missing and provide helpful error
  const missing: string[] = [];
  if (!publicKey) missing.push('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY');
  if (!serviceId) missing.push('NEXT_PUBLIC_EMAILJS_SERVICE_ID');
  if (!templateId) missing.push('NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID');

  if (missing.length > 0) {
    throw new Error(
      `EmailJS configuration is missing. Missing variables: ${missing.join(', ')}. ` +
      `Please create a .env.local file in the project root with these variables. ` +
      `See ENV_EXAMPLE.txt for reference.`
    );
  }

  // At this point, we know serviceId and templateId are defined (not undefined)
  // TypeScript needs explicit assertion
  if (!serviceId || !templateId) {
    throw new Error('Service ID and Template ID must be defined');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Carpool App';
  const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

  try {
    // TypeScript assertion: we've already checked these are defined above
    const result = await emailjs.send(
      serviceId as string,
      templateId as string,
      {
        email: email, // EmailJS template field
        to_email: email, // Alternative variable name
        verification_url: verificationUrl,
        app_name: appName,
      }
    );
    console.log('Verification email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID;

  // Check which variables are missing and provide helpful error
  const missing: string[] = [];
  if (!publicKey) missing.push('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY');
  if (!serviceId) missing.push('NEXT_PUBLIC_EMAILJS_SERVICE_ID');
  if (!templateId) missing.push('NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID');

  if (missing.length > 0) {
    throw new Error(
      `EmailJS configuration is missing. Missing variables: ${missing.join(', ')}. ` +
      `Please create a .env.local file in the project root with these variables. ` +
      `See ENV_EXAMPLE.txt for reference.`
    );
  }

  // At this point, we know serviceId and templateId are defined (not undefined)
  // TypeScript needs explicit assertion
  if (!serviceId || !templateId) {
    throw new Error('Service ID and Template ID must be defined');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Carpool App';
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  try {
    // TypeScript assertion: we've already checked these are defined above
    const result = await emailjs.send(
      serviceId as string,
      templateId as string,
      {
        email: email, // EmailJS template field
        to_email: email, // Alternative variable name
        reset_url: resetUrl,
        app_name: appName,
      }
    );
    console.log('Password reset email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error(`Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

