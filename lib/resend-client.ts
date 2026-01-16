/**
 * Server-side Resend email utility
 * Used to send transactional emails like ride expiration notifications
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@carpool.app';

// Helper to validate email format before sending to Resend
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendRideExpirationEmail(
  userEmail: string,
  userName: string,
  rideDetails: {
    startLocation: string;
    endLocation: string;
    rideDate: string;
    rideTime: string;
    rideType: 'offering' | 'seeking';
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping email notification.');
    return;
  }

  try {
    const rideTypeLabel = rideDetails.rideType === 'offering' ? 'Ride Offer' : 'Ride Request';
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Carpool App';
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/dashboard?tab=my-rides`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; 
              background: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo-section {
              background: #ffffff;
              padding: 30px;
              text-align: center;
              border-bottom: 1px solid #eee;
            }
            .logo-section img {
              max-height: 48px;
              width: auto;
            }
            .header { 
              background: #1a1a1a; 
              color: white; 
              padding: 20px; 
              text-align: center;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.5px;
            }
            .content { 
              background: white; 
              padding: 30px; 
              color: #333;
            }
            .content p {
              line-height: 1.6;
              color: #555;
            }
            .ride-details { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 4px; 
              margin: 20px 0; 
              border-left: 3px solid #1a1a1a;
            }
            .ride-details p { 
              margin: 10px 0;
              color: #333;
            }
            .label { 
              font-weight: 600; 
              color: #1a1a1a;
              display: inline-block;
              min-width: 70px;
            }
            .button { 
              display: inline-block; 
              background: #1a1a1a; 
              color: white; 
              padding: 12px 28px; 
              border-radius: 4px; 
              text-decoration: none; 
              margin-top: 20px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #333;
            }
            .section-title {
              font-weight: 600;
              color: #1a1a1a;
              margin-top: 20px;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .content ul {
              color: #555;
              padding-left: 20px;
            }
            .content ul li {
              margin: 8px 0;
              line-height: 1.5;
            }
            .footer { 
              background: #f5f5f5; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #999;
              border-top: 1px solid #eee;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/RideShare_Logo.png" alt="RideShare Logo">
            </div>
            <div class="header">
              <h2>Ride Expired</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Your ${rideTypeLabel} on <strong>RideShare</strong> has expired and is no longer visible to other users.</p>
              
              <div class="ride-details">
                <p><span class="label">Route:</span> ${rideDetails.startLocation} → ${rideDetails.endLocation}</p>
                <p><span class="label">Date:</span> ${rideDetails.rideDate}</p>
                <p><span class="label">Time:</span> ${rideDetails.rideTime}</p>
                <p><span class="label">Type:</span> ${rideTypeLabel}</p>
              </div>
              
              <p class="section-title">WHAT HAPPENS NEXT</p>
              <ul>
                <li>Your ride is now archived and hidden from the public feed</li>
                <li>You can reactivate it from your dashboard to extend it for another 24 hours</li>
                <li>Your conversations will remain in your message history</li>
              </ul>
              
              <a href="${dashboardUrl}" class="button">View My Rides</a>
            </div>
            <div class="footer">
              <p>&copy; 2025 RideShare. All rights reserved.</p>
              <p>You received this email because a ride you posted has expired.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Your ${rideTypeLabel} Has Expired - ${appName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('Failed to send ride expiration email:', result.error);
    } else {
      // Success
    }
  } catch (error) {
    console.error('Error sending ride expiration email:', error);
    // Don't throw - we don't want to block ride operations
  }
}
/**
 * Send community request approval email
 */
export async function sendCommunityApprovalEmail(
  userEmail: string,
  userName: string,
  communityName: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping email notification.');
    return;
  }

  if (!isValidEmail(userEmail)) {
    console.warn(`⚠️ Invalid recipient email format: "${userEmail}". Skipping community approval email.`);
    return;
  }

  try {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/dashboard?tab=communities`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; 
              background: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo-section {
              background: #ffffff;
              padding: 30px;
              text-align: center;
              border-bottom: 1px solid #eee;
            }
            .logo-section img {
              max-height: 48px;
              width: auto;
            }
            .header { 
              background: #1a1a1a; 
              color: white; 
              padding: 20px; 
              text-align: center;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.5px;
            }
            .content { 
              background: white; 
              padding: 30px; 
              color: #333;
            }
            .content p {
              line-height: 1.6;
              color: #555;
            }
            .community-box { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 4px; 
              margin: 20px 0; 
              border-left: 3px solid #1a1a1a;
              text-align: center;
            }
            .community-name {
              font-weight: 600;
              color: #1a1a1a;
              font-size: 18px;
            }
            .button { 
              display: inline-block; 
              background: #1a1a1a; 
              color: white; 
              padding: 12px 28px; 
              border-radius: 4px; 
              text-decoration: none; 
              margin-top: 20px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #333;
            }
            .footer { 
              background: #f5f5f5; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #999;
              border-top: 1px solid #eee;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/RideShare_Logo.png" alt="RideShare Logo">
            </div>
            <div class="header">
              <h2>Community Approved!</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Great news! Your community request has been approved.</p>
              
              <div class="community-box">
                <p class="community-name">${communityName}</p>
                <p style="color: #999; margin: 0; font-size: 14px;">Your community is now live!</p>
              </div>
              
              <p>You can now:</p>
              <ul>
                <li>Start managing your community</li>
                // <li>Invite members to join</li>
                <li>Post rides within your community</li>
                <li>Build connections with community members</li>
              </ul>
              
              <a href="${dashboardUrl}" class="button">View My Communities</a>
            </div>
            <div class="footer">
              <p>&copy; 2025 RideShare. All rights reserved.</p>
              <p>You received this email because your community request was approved.</p>
            </div>
          </div>
        </body>
      </html>
    `;



    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `🎉 Community Approved: ${communityName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Resend Error (Community Approval):', result.error);
    } else {
      // Success
    }
  } catch (error) {
    console.error('💥 Fatal Error sending community approval email:', error);
  }
}
/**
 * Send NIC verification rejection email
 */
export async function sendNICRejectionEmail(
  userEmail: string,
  userName: string,
  rejectionReason: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping email notification.');
    return;
  }

  if (!isValidEmail(userEmail)) {
    console.warn(`⚠️ Invalid recipient email format: "${userEmail}". Skipping NIC rejection email.`);
    return;
  }

  try {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/dashboard`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; 
              background: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo-section {
              background: #ffffff;
              padding: 30px;
              text-align: center;
              border-bottom: 1px solid #eee;
            }
            .logo-section img {
              max-height: 48px;
              width: auto;
            }
            .header { 
              background: #1a1a1a; 
              color: white; 
              padding: 20px; 
              text-align: center;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.5px;
            }
            .content { 
              background: white; 
              padding: 30px; 
              color: #333;
            }
            .content p {
              line-height: 1.6;
              color: #555;
            }
            .reason-box { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 4px; 
              margin: 20px 0; 
              border-left: 3px solid #1a1a1a;
            }
            .reason-label {
              font-weight: 600;
              color: #1a1a1a;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .reason-text{
              color: #333;
              line-height: 1.6;
              font-size: 14px;
            }
            .button { 
              display: inline-block; 
              background: #1a1a1a; 
              color: white; 
              padding: 12px 28px; 
              border-radius: 4px; 
              text-decoration: none; 
              margin-top: 20px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #333;
            }
            .next-steps {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .next-steps li {
              margin: 8px 0;
              color: #555;
            }
            .footer { 
              background: #f5f5f5; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #999;
              border-top: 1px solid #eee;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/RideShare_Logo.png" alt="RideShare Logo">
            </div>
            <div class="header">
              <h2>NIC Verification Unsuccessful</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Unfortunately, your NIC verification submission has been rejected. Please review the reason below and resubmit with the correct information.</p>
              
              <div class="reason-box">
                <div class="reason-label">Reason for Rejection</div>
                <div class="reason-text">${rejectionReason}</div>
              </div>
              
              <p><strong>What you can do:</strong></p>
              <ul class="next-steps">
                <li>Review the rejection reason carefully</li>
                <li>Ensure your NIC images are clear and legible</li>
                <li>Verify that both front and back sides are fully visible</li>
                <li>Make sure the document is not expired</li>
                <li>Resubmit your NIC for verification</li>
              </ul>
              
              <p>You can resubmit your NIC anytime from your profile page. We're here to help!</p>
              
              <a href="${dashboardUrl}" class="button">Go to Profile</a>
            </div>
            <div class="footer">
              <p>&copy; 2025 RideShare. All rights reserved.</p>
              <p>You received this email because your NIC verification was rejected.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `NIC Verification Rejected - Please Resubmit`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Resend Error (NIC Rejection):', result.error);
    } else {
      // Success
    }
  } catch (error) {
    console.error('💥 Fatal Error sending NIC rejection email:', error);
  }
}

/**
 * Send community request rejection email
 */
export async function sendCommunityRejectionEmail(
  userEmail: string,
  userName: string,
  communityName: string,
  rejectionReason: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping email notification.');
    return;
  }

  if (!isValidEmail(userEmail)) {
    console.warn(`⚠️ Invalid recipient email format: "${userEmail}". Skipping community rejection email.`);
    return;
  }

  try {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/dashboard`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; 
              background: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo-section {
              background: #ffffff;
              padding: 30px;
              text-align: center;
              border-bottom: 1px solid #eee;
            }
            .logo-section img {
              max-height: 48px;
              width: auto;
            }
            .header { 
              background: #1a1a1a; 
              color: white; 
              padding: 20px; 
              text-align: center;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.5px;
            }
            .content { 
              background: white; 
              padding: 30px; 
              color: #333;
            }
            .content p {
              line-height: 1.6;
              color: #555;
            }
            .community-box {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
              border-left: 3px solid #1a1a1a;
            }
            .community-name {
              font-weight: 600;
              color: #1a1a1a;
              font-size: 16px;
            }
            .reason-box { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 4px; 
              margin: 20px 0; 
              border-left: 3px solid #1a1a1a;
            }
            .reason-label {
              font-weight: 600;
              color: #1a1a1a;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .reason-text{
              color: #333;
              line-height: 1.6;
              font-size: 14px;
            }
            .button { 
              display: inline-block; 
              background: #1a1a1a; 
              color: white; 
              padding: 12px 28px; 
              border-radius: 4px; 
              text-decoration: none; 
              margin-top: 20px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #333;
            }
            .footer { 
              background: #f5f5f5; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #999;
              border-top: 1px solid #eee;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/RideShare_Logo.png" alt="RideShare Logo">
            </div>
            <div class="header">
              <h2>Community Request Rejected</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>We've reviewed your community request and unfortunately, it has been rejected at this time.</p>
              
              <div class="community-box">
                <div class="community-name">${communityName}</div>
              </div>
              
              <div class="reason-box">
                <div class="reason-label">Reason for Rejection</div>
                <div class="reason-text">${rejectionReason}</div>
              </div>
              
              <p><strong>What you can do:</strong></p>
              <ul>
                <li>Review the feedback provided above</li>
                <li>Submit a new request with improved information</li>
              </ul>
              
              <p>We welcome resubmissions and appreciate your interest in building a community on RideShare!</p>
              
              <a href="${dashboardUrl}" class="button">View Communities</a>
            </div>
            <div class="footer">
              <p>&copy; 2025 RideShare. All rights reserved.</p>
              <p>You received this email because your community request was rejected.</p>
            </div>
          </div>
        </body>
      </html>
    `;



    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Community Request Rejected: ${communityName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Resend Error (Community Rejection):', result.error);
    } else {
      // Success
    }
  } catch (error) {
    console.error('💥 Fatal Error sending community rejection email:', error);
  }
}
/**
 * Send NIC verification approval email
 */
export async function sendNICApprovalEmail(
  userEmail: string,
  userName: string,
  nicNumber: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping email notification.');
    return;
  }

  if (!isValidEmail(userEmail)) {
    console.warn(`⚠️ Invalid recipient email format: "${userEmail}". Skipping NIC approval email.`);
    return;
  }

  try {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/dashboard`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; 
              background: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo-section {
              background: #ffffff;
              padding: 30px;
              text-align: center;
              border-bottom: 1px solid #eee;
            }
            .logo-section img {
              max-height: 48px;
              width: auto;
            }
            .header { 
              background: #1a1a1a; 
              color: white; 
              padding: 20px; 
              text-align: center;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.5px;
            }
            .content { 
              background: white; 
              padding: 30px; 
              color: #333;
            }
            .content p {
              line-height: 1.6;
              color: #555;
            }
            .nic-box { 
              background: #f9f9f9; 
              padding: 20px; 
              border-radius: 4px; 
              margin: 20px 0; 
              border-left: 3px solid #1a1a1a;
              text-align: center;
            }
            .nic-label {
              font-weight: 600;
              color: #999;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .nic-number{
              font-weight: 600;
              color: #1a1a1a;
              font-size: 16px;
              font-family: monospace;
            }
            .button { 
              display: inline-block; 
              background: #1a1a1a; 
              color: white; 
              padding: 12px 28px; 
              border-radius: 4px; 
              text-decoration: none; 
              margin-top: 20px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #333;
            }
            .benefits {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .benefits li {
              margin: 8px 0;
              color: #555;
            }
            .footer { 
              background: #f5f5f5; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #999;
              border-top: 1px solid #eee;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharee.com'}/RideShare_Logo.png" alt="RideShare Logo">
            </div>
            <div class="header">
              <h2>NIC Verified! ✓</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Congratulations! Your NIC has been verified successfully.</p>
              
              <div class="nic-box">
                <div class="nic-label">Verified NIC Number</div>
                <div class="nic-number">${nicNumber}</div>
              </div>
              
              <p><strong>What this means:</strong></p>
              <ul class="benefits">
                <li>✓ Your account is now fully verified and trusted</li>
                <li>✓ Other users can see your verified badge on rides</li>
                <li>✓ You have access to all premium features</li>
                <li>✓ Your profile is more visible in search results</li>
              </ul>
              
              <p>You can now enjoy the full RideShare experience with verified status!</p>
              
              <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>&copy; 2025 RideShare. All rights reserved.</p>
              <p>You received this email because your NIC verification was approved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `✓ NIC Verification Approved - RideShare`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Resend Error (NIC Approval):', result.error);
    } else {
      console.log('✅ NIC approval email sent successfully:', result.data);
    }
  } catch (error) {
    console.error('💥 Fatal Error sending NIC approval email:', error);
  }
}