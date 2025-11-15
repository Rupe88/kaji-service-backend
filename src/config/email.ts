import nodemailer from 'nodemailer';
import { emailConfig } from './env';
import { sendEmailViaSendGrid, testSendGridConnection } from './sendgrid';

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: false,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

/**
 * Test email service connections (Nodemailer and SendGrid)
 */
export const testEmailConnection = async (): Promise<{ nodemailer: boolean; sendgrid: boolean }> => {
  let nodemailerConnected = false;
  let sendgridConnected = false;

  // Test Nodemailer (primary)
  try {
    await transporter.verify();
    console.log('✅ Email service (Gmail/Nodemailer) connected successfully');
    console.log(`📧 SMTP: ${emailConfig.host}:${emailConfig.port}`);
    console.log(`📮 From: ${emailConfig.from}`);
    nodemailerConnected = true;
  } catch (error: any) {
    console.error('❌ Email service (Nodemailer) connection failed:', error.message || error);
  }

  // Test SendGrid (fallback)
  sendgridConnected = await testSendGridConnection();

  if (!nodemailerConnected && !sendgridConnected) {
    console.warn('⚠️  Warning: No email service is available!');
  } else if (!nodemailerConnected && sendgridConnected) {
    console.log('ℹ️  Using SendGrid as primary email service (Nodemailer unavailable)');
  } else if (nodemailerConnected && sendgridConnected) {
    console.log('ℹ️  SendGrid available as fallback email service');
  }

  return { nodemailer: nodemailerConnected, sendgrid: sendgridConnected };
};

/**
 * Send email with automatic fallback to SendGrid if Nodemailer fails
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  const startTime = Date.now();
  
  // Try Nodemailer first (primary)
  try {
    const info = await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      html,
    });
    const duration = Date.now() - startTime;
    console.log(`✅ Email sent via Nodemailer: ${subject} → ${to} (${duration}ms)`);
    return info;
  } catch (nodemailerError: any) {
    const duration = Date.now() - startTime;
    console.warn(`⚠️  Nodemailer failed: ${subject} → ${to} (${duration}ms) - ${nodemailerError.message || nodemailerError}`);
    console.log('🔄 Attempting fallback to SendGrid...');

    // Fallback to SendGrid
    if (emailConfig.sendgridApiKey) {
      try {
        const sendgridStartTime = Date.now();
        const result = await sendEmailViaSendGrid(to, subject, html);
        const sendgridDuration = Date.now() - sendgridStartTime;
        console.log(`✅ Email sent via SendGrid (fallback): ${subject} → ${to} (${sendgridDuration}ms)`);
        return result;
      } catch (sendgridError: any) {
        const totalDuration = Date.now() - startTime;
        console.error(`❌ Both email services failed!`);
        console.error(`   Nodemailer: ${nodemailerError.message || nodemailerError}`);
        console.error(`   SendGrid: ${sendgridError.message || sendgridError}`);
        console.error(`   Total duration: ${totalDuration}ms`);
        throw new Error(`Email send failed (both services): ${sendgridError.message || sendgridError}`);
      }
    } else {
      // No SendGrid fallback available
      const totalDuration = Date.now() - startTime;
      console.error(`❌ Email send failed: ${subject} → ${to} (${totalDuration}ms) - ${nodemailerError.message || nodemailerError}`);
      console.error('   SendGrid fallback not configured');
      throw nodemailerError;
    }
  }
};

/**
 * Send OTP email with automatic fallback to SendGrid if Nodemailer fails
 * This function uses sendEmail which already has SendGrid fallback built-in
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

  // sendEmail already has SendGrid fallback built-in
  // If Nodemailer fails, it will automatically try SendGrid
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

export default transporter;

