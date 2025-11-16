import sgMail from '@sendgrid/mail';
import nodemailer, { Transporter } from 'nodemailer';
import { emailConfig } from '../config/env';
import { ApiError } from '../utils/ApiError';

interface EmailUser {
  email?: string | null;
  firstName?: string | null;
  verificationToken?: string | null;
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

class EmailService {
  private sender: string = '';
  private senderName: string = 'HR Platform';
  private gmailTransporter: Transporter | null = null;
  private useSendGrid: boolean = false;

  constructor() {
    // Initialize SendGrid (primary)
    if (emailConfig.sendgridApiKey && emailConfig.sendgridFrom) {
      try {
        const apiKey = emailConfig.sendgridApiKey.trim();
        if (apiKey.length < 20) {
          console.warn('⚠️  SendGrid API key seems too short. Please verify it\'s correct.');
        }
        sgMail.setApiKey(apiKey);
        this.sender = emailConfig.sendgridFrom;
        this.senderName = 'HR Platform';
        this.useSendGrid = true;
        console.log('✅ SendGrid initialized as primary email service');
        console.log(`📧 SendGrid From: ${this.sender}`);
      } catch (error) {
        console.warn('⚠️  SendGrid initialization failed, will use Gmail SMTP');
        this.useSendGrid = false;
      }
    } else {
      console.warn('⚠️  SendGrid credentials not found, using Gmail SMTP only');
    }

    // Initialize Gmail SMTP as fallback
    if (emailConfig.user && emailConfig.pass) {
      try {
        this.gmailTransporter = nodemailer.createTransport({
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
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
          pool: true,
          maxConnections: 1,
          maxMessages: 3,
        });

        if (!this.sender) {
          this.sender = emailConfig.from;
          this.senderName = 'HR Platform';
        }

        console.log(
          '✅ Gmail SMTP initialized as ' +
            (this.useSendGrid ? 'fallback' : 'primary') +
            ' email service'
        );
        if (this.useSendGrid) {
          console.warn('⚠️  Note: Gmail SMTP may not work reliably in production (Render/cloud hosting)');
          console.warn('⚠️  Recommendation: Use SendGrid for production email delivery');
        }
      } catch (error: any) {
        console.warn('⚠️  Gmail SMTP initialization failed:', error.message);
      }
    }

    if (!this.useSendGrid && !this.gmailTransporter) {
      throw new Error(
        'No email service configured. Need either SendGrid or Gmail SMTP credentials.'
      );
    }

    if (!this.sender) {
      throw new Error('Email sender not configured properly');
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResponse> {
    if (this.useSendGrid) {
      try {
        const msg = {
          to,
          from: this.sender,
          subject,
          html,
        };

        const result = await sgMail.send(msg);
        console.log(`✅ Email sent via SendGrid to ${to}`);
        return {
          success: true,
          message: 'Email sent successfully via SendGrid',
          messageId: result[0]?.headers?.['x-message-id'] || undefined,
        };
      } catch (error: any) {
        console.error(`❌ SendGrid failed:`, error.message);

        // Log detailed error information
        if (error.response) {
          const { body, statusCode } = error.response;
          console.error('   Status Code:', statusCode);
          console.error('   Response Body:', JSON.stringify(body, null, 2));

          if (body?.errors) {
            body.errors.forEach((err: any) => {
              console.error(`   - ${err.message} (field: ${err.field || 'N/A'})`);
            });
          }

          // Add helpful hints for common errors
          if (error.code === 401 || error.message?.includes('Unauthorized')) {
            console.error('');
            console.error('🔧 TROUBLESHOOTING: SendGrid API Key Issue');
            console.error('   1. Check your SENDGRID_API_KEY in Render environment variables');
            console.error('   2. Verify the API key is correct (no extra spaces or quotes)');
            console.error('   3. Regenerate API key in SendGrid Dashboard → Settings → API Keys');
            console.error('   4. Ensure API key has "Mail Send" permissions enabled');
            console.error('   5. Make sure the API key hasn\'t been revoked or expired');
            console.error('');
          }
        }

        // If SendGrid fails and Gmail is available, use it as fallback
        if (this.gmailTransporter) {
          console.log('🔄 Switching to Gmail SMTP fallback...');
          return this.sendViaGmail(to, subject, html);
        }

        throw new ApiError(500, `Failed to send email: ${error.message}`);
      }
    }

    // Use Gmail SMTP if SendGrid not configured
    if (this.gmailTransporter) {
      return this.sendViaGmail(to, subject, html);
    }

    throw new ApiError(500, 'No email service available');
  }

  private async sendViaGmail(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResponse> {
    if (!this.gmailTransporter) {
      throw new ApiError(500, 'Gmail transport not configured');
    }

    try {
      const info = await this.gmailTransporter.sendMail({
        from: `"${this.senderName}" <${this.sender}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent via Gmail SMTP to ${to}`);
      return {
        success: true,
        message: 'Email sent successfully via Gmail',
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('❌ Gmail SMTP failed:', error.message);
      throw new ApiError(500, `Failed to send email via Gmail: ${error.message}`);
    }
  }

  async sendOTPEmail(
    user: EmailUser,
    otp: string,
    type: 'VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN' = 'VERIFICATION'
  ): Promise<EmailResponse> {
    const subject =
      type === 'VERIFICATION'
        ? 'Verify Your Email - HR Platform'
        : type === 'PASSWORD_RESET'
        ? 'Reset Your Password - HR Platform'
        : 'Login OTP - HR Platform';

    const html = this.otpEmailTemplate(user.firstName || 'User', otp, type);
    return this.sendEmail(user.email ?? '', subject, html);
  }

  private otpEmailTemplate(
    firstName: string,
    otp: string,
    type: 'VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN'
  ): string {
    const title =
      type === 'VERIFICATION'
        ? 'Email Verification Required'
        : type === 'PASSWORD_RESET'
        ? 'Reset Your Password'
        : 'Login Verification';

    const description =
      type === 'VERIFICATION'
        ? 'Thank you for registering with HR Platform. Use the following verification code to verify your email address:'
        : type === 'PASSWORD_RESET'
        ? 'You requested to reset your password. Use the following OTP to proceed:'
        : 'Use the following OTP to complete your login:';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #4F46E5;">
            <h1 style="color: #4F46E5; margin: 0;">HR Platform</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333333; margin-bottom: 20px;">${title}</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.6;">Hello ${firstName},</p>
            <p style="color: #666666; font-size: 16px; line-height: 1.6;">${description}</p>
            
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); color: #ffffff; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 30px 0; box-shadow: 0 4px 6px rgba(79,70,229,0.3);">
              ${otp}
            </div>
            
            <p style="color: #666666; font-size: 14px; line-height: 1.6;">⏱️ This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6;">If you didn't request this code, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #999999; font-size: 12px;">
            <p>Best regards,<br><strong>HR Platform Team</strong></p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} HR Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendForgetPasswordEmail(
    user: EmailUser,
    resetToken: string
  ): Promise<EmailResponse> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #4F46E5;">
            <h1 style="color: #4F46E5; margin: 0;">HR Platform</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333333; margin-bottom: 20px;">Reset Your Password</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.6;">Hello ${user.firstName || 'User'},</p>
            <p style="color: #666666; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(79,70,229,0.3);">Reset Password</a>
            </div>
            
            <p style="color: #666666; font-size: 14px; line-height: 1.6;">⏱️ This link expires in <strong>1 hour</strong>.</p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #4F46E5; border-radius: 4px;">
              <p style="color: #666666; font-size: 13px; margin: 0; line-height: 1.6;">
                <strong>Note:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #4F46E5; word-break: break-all;">${resetUrl}</span>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #999999; font-size: 12px;">
            <p>Best regards,<br><strong>HR Platform Team</strong></p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} HR Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email ?? '', 'Reset Your Password', html);
  }

  async verifyTransport(): Promise<boolean> {
    try {
      if (this.useSendGrid) {
        console.log('✅ SendGrid configured as primary service');
      }

      if (this.gmailTransporter) {
        const verifyWithTimeout = Promise.race([
          this.gmailTransporter.verify(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Verification timeout')), 5000)
          ),
        ]);

        await verifyWithTimeout;
        console.log('✅ Gmail SMTP verified successfully');
      }

      return true;
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.warn(
          '⚠️  Gmail verification timed out (this is normal on Render)'
        );
        console.log('✅ Gmail SMTP will be used when needed');
      } else {
        console.error('❌ Email service verification failed:', error.message);
      }
      return true; // Don't fail startup if verification times out
    }
  }
}

const emailService = new EmailService();

export default emailService;

