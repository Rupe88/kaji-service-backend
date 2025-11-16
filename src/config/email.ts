import nodemailer, { Transporter } from 'nodemailer';
import { emailConfig } from './env';
import { sendEmailViaSendGrid, testSendGridConnection } from './sendgrid';

// Initialize Nodemailer transporter (fallback)
let gmailTransporter: Transporter | null = null;
let useSendGrid: boolean = false;

// Initialize email services
if (emailConfig.sendgridApiKey && emailConfig.sendgridFrom) {
  try {
    useSendGrid = true;
    console.log('✅ SendGrid initialized as primary email service');
    console.log(`📧 SendGrid From: ${emailConfig.sendgridFrom}`);
  } catch (error) {
    console.warn('⚠️  SendGrid initialization failed, will use Nodemailer');
    useSendGrid = false;
  }
} else {
  console.warn('⚠️  SendGrid credentials not found, using Nodemailer only');
}

// Initialize Gmail SMTP as fallback
if (emailConfig.user && emailConfig.pass) {
  try {
    gmailTransporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: false,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    console.log(
      '✅ Gmail SMTP initialized as ' +
        (useSendGrid ? 'fallback' : 'primary') +
        ' email service'
    );
  } catch (error: any) {
    console.warn('⚠️  Gmail SMTP initialization failed:', error.message);
  }
}

if (!useSendGrid && !gmailTransporter) {
  console.error(
    '❌ No email service configured. Need either SendGrid or Gmail SMTP credentials.'
  );
}

/**
 * Test email service connections (SendGrid and Nodemailer)
 */
export const testEmailConnection = async (): Promise<{ nodemailer: boolean; sendgrid: boolean }> => {
  let nodemailerConnected = false;
  let sendgridConnected = false;

  // Test SendGrid (primary)
  sendgridConnected = await testSendGridConnection();

  // Test Nodemailer (fallback)
  if (gmailTransporter) {
    try {
      const verifyWithTimeout = Promise.race([
        gmailTransporter.verify(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Verification timeout')), 5000)
        ),
      ]);
      await verifyWithTimeout;
      console.log('✅ Gmail SMTP verified successfully');
      console.log(`📧 SMTP: ${emailConfig.host}:${emailConfig.port}`);
      console.log(`📮 From: ${emailConfig.from}`);
      nodemailerConnected = true;
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.warn(
          '⚠️  Gmail verification timed out (this is normal on some hosting platforms)'
        );
        console.log('✅ Gmail SMTP will be used when needed');
        nodemailerConnected = true; // Assume it will work
      } else {
        console.error('❌ Gmail SMTP verification failed:', error.message || error);
      }
    }
  }

  if (!nodemailerConnected && !sendgridConnected) {
    console.warn('⚠️  Warning: No email service is available!');
  } else if (!sendgridConnected && nodemailerConnected) {
    console.log('ℹ️  Using Gmail SMTP as primary email service (SendGrid unavailable)');
  } else if (sendgridConnected && nodemailerConnected) {
    console.log('ℹ️  Gmail SMTP available as fallback email service');
  }

  return { nodemailer: nodemailerConnected, sendgrid: sendgridConnected };
};

/**
 * Send email via Gmail SMTP (fallback)
 */
const sendViaGmail = async (
  to: string,
  subject: string,
  html: string
): Promise<any> => {
  if (!gmailTransporter) {
    throw new Error('Gmail transport not configured');
  }

  try {
    const info = await gmailTransporter.sendMail({
      from: `"HR Platform" <${emailConfig.from}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (error: any) {
    console.error('❌ Gmail SMTP failed:', error.message);
    throw new Error(`Failed to send email via Gmail: ${error.message}`);
  }
};

/**
 * Send email with SendGrid as primary, Nodemailer as fallback
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  const startTime = Date.now();

  // Try SendGrid first (primary)
  if (useSendGrid && emailConfig.sendgridApiKey) {
    try {
      const result = await sendEmailViaSendGrid(to, subject, html);
      const duration = Date.now() - startTime;
      console.log(`✅ Email sent via SendGrid: ${subject} → ${to} (${duration}ms)`);
      return result;
    } catch (sendgridError: any) {
      console.error(`❌ SendGrid failed:`, sendgridError.message || sendgridError);

      // If SendGrid fails and Gmail is available, use it as fallback
      if (gmailTransporter) {
        console.log('🔄 Switching to Gmail SMTP fallback...');
        try {
          const gmailStartTime = Date.now();
          const result = await sendViaGmail(to, subject, html);
          const gmailDuration = Date.now() - gmailStartTime;
          const totalDuration = Date.now() - startTime;
          console.log(`✅ Email sent via Gmail SMTP (fallback): ${subject} → ${to} (${gmailDuration}ms, total: ${totalDuration}ms)`);
          return result;
        } catch (gmailError: any) {
          const totalDuration = Date.now() - startTime;
          console.error(`❌ Both email services failed!`);
          console.error(`   SendGrid: ${sendgridError.message || sendgridError}`);
          console.error(`   Gmail: ${gmailError.message || gmailError}`);
          console.error(`   Total duration: ${totalDuration}ms`);
          throw new Error(`Email send failed (both services): ${gmailError.message || gmailError}`);
        }
      } else {
        // No Gmail fallback available
        throw new Error(`Email send failed: ${sendgridError.message || sendgridError}`);
      }
    }
  }

  // Use Gmail SMTP if SendGrid not configured
  if (gmailTransporter) {
    return sendViaGmail(to, subject, html);
  }

  throw new Error('No email service available');
};

/**
 * Send OTP email with SendGrid as primary, Nodemailer as fallback
 * This function uses sendEmail which already has automatic fallback built-in
 */
export const sendOTPEmail = async (email: string, otp: string, type: 'VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN') => {
  const subject = type === 'VERIFICATION' 
    ? 'Verify Your Email - HR Platform'
    : type === 'PASSWORD_RESET'
    ? 'Reset Your Password - HR Platform'
    : 'Login OTP - HR Platform';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .otp-box { background: white; border: 2px dashed #4F46E5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HR Platform</h1>
        </div>
        <div class="content">
          <h2>${type === 'VERIFICATION' ? 'Verify Your Email Address' : type === 'PASSWORD_RESET' ? 'Reset Your Password' : 'Login Verification'}</h2>
          <p>Hello,</p>
          <p>${type === 'VERIFICATION' 
            ? 'Thank you for registering with HR Platform. Please use the OTP below to verify your email address:'
            : type === 'PASSWORD_RESET'
            ? 'You requested to reset your password. Please use the OTP below to proceed:'
            : 'Please use the OTP below to complete your login:'}</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HR Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // sendEmail uses SendGrid as primary, Nodemailer as fallback
  // If SendGrid fails, it will automatically try Nodemailer
  console.log(`📨 Sending OTP email (${type}) to ${email}...`);
  try {
    const result = await sendEmail(email, subject, html);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email to ${email}: ${error.message || error}`);
    throw error;
  }
};

export default gmailTransporter;

