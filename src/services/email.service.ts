import { Resend } from 'resend';
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
  private resendClient: Resend | null = null;
  private useResend: boolean = false;
  private useSendGrid: boolean = false;

  constructor() {
    // Initialize Resend (primary - highest priority)
    if (emailConfig.resendApiKey && emailConfig.resendFrom) {
      try {
        this.resendClient = new Resend(emailConfig.resendApiKey);
        this.sender = emailConfig.resendFrom;
        this.senderName = emailConfig.resendFromName || 'HR Platform';
        this.useResend = true;
        console.log('✅ Resend initialized as primary email service');
        console.log(`📧 Resend From: ${this.sender}`);
      } catch (error) {
        console.warn('⚠️  Resend initialization failed, will try SendGrid');
        this.useResend = false;
      }
    } else {
      console.warn('⚠️  Resend credentials not found');
    }

    // Initialize SendGrid (secondary)
    if (emailConfig.sendgridApiKey && emailConfig.sendgridFrom) {
      try {
        const apiKey = emailConfig.sendgridApiKey.trim();
        if (apiKey.length < 20) {
          console.warn('⚠️  SendGrid API key seems too short. Please verify it\'s correct.');
        }
        sgMail.setApiKey(apiKey);
        if (!this.sender) {
          this.sender = emailConfig.sendgridFrom;
          this.senderName = 'HR Platform';
        }
        this.useSendGrid = true;
        console.log(
          '✅ SendGrid initialized as ' +
            (this.useResend ? 'secondary' : 'primary') +
            ' email service'
        );
        console.log(`📧 SendGrid From: ${emailConfig.sendgridFrom}`);
      } catch (error) {
        console.warn('⚠️  SendGrid initialization failed, will use Gmail SMTP');
        this.useSendGrid = false;
      }
    } else {
      console.warn('⚠️  SendGrid credentials not found');
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
            (this.useResend || this.useSendGrid ? 'fallback' : 'primary') +
            ' email service'
        );
        if (this.useResend || this.useSendGrid) {
          console.warn('⚠️  Note: Gmail SMTP may not work reliably in production (Render/cloud hosting)');
        }
      } catch (error: any) {
        console.warn('⚠️  Gmail SMTP initialization failed:', error.message);
      }
    }

    if (!this.useResend && !this.useSendGrid && !this.gmailTransporter) {
      throw new Error(
        'No email service configured. Need either Resend, SendGrid, or Gmail SMTP credentials.'
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
    // Try Resend first (primary)
    if (this.useResend && this.resendClient) {
      try {
        const { data, error } = await this.resendClient.emails.send({
          from: `${this.senderName} <${this.sender}>`,
          to: [to],
          subject,
          html,
        });

        if (error) {
          console.error(`❌ Resend failed:`, error);

          // If Resend fails, try SendGrid
          if (this.useSendGrid) {
            console.log('🔄 Switching to SendGrid...');
            return this.sendViaSendGrid(to, subject, html);
          }

          // If SendGrid not available, try Gmail
          if (this.gmailTransporter) {
            console.log('🔄 Switching to Gmail SMTP fallback...');
            return this.sendViaGmail(to, subject, html);
          }

          throw new ApiError(500, `Failed to send email: ${error.message}`);
        }

        console.log(`✅ Email sent via Resend to ${to}`);
        return {
          success: true,
          message: 'Email sent successfully via Resend',
          messageId: data?.id,
        };
      } catch (error: any) {
        console.error(`❌ Resend error:`, error.message);

        // If Resend fails, try SendGrid
        if (this.useSendGrid) {
          console.log('🔄 Switching to SendGrid...');
          return this.sendViaSendGrid(to, subject, html);
        }

        // If SendGrid not available, try Gmail
        if (this.gmailTransporter) {
          console.log('🔄 Switching to Gmail SMTP fallback...');
          return this.sendViaGmail(to, subject, html);
        }

        throw new ApiError(500, `Failed to send email: ${error.message}`);
      }
    }

    // Try SendGrid if Resend not configured
    if (this.useSendGrid) {
      return this.sendViaSendGrid(to, subject, html);
    }

    // Use Gmail SMTP if nothing else configured
    if (this.gmailTransporter) {
      return this.sendViaGmail(to, subject, html);
    }

    throw new ApiError(500, 'No email service available');
  }

  private async sendViaSendGrid(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResponse> {
    try {
      const msg = {
        to,
        from: emailConfig.sendgridFrom!,
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

          // Check for credit limit error
          if (body.errors.some((e: any) => e.message?.includes('credits'))) {
            console.error('');
            console.error('🔧 TROUBLESHOOTING: SendGrid Credit Limit Exceeded');
            console.error('   1. SendGrid free tier: 100 emails/day');
            console.error('   2. Wait for daily reset OR upgrade SendGrid account');
            console.error('   3. Consider using Resend (3,000 emails/month free)');
            console.error('   4. Add RESEND_API_KEY to use Resend as primary');
            console.error('');
          }
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

  async sendJobRecommendationEmail(
    user: EmailUser,
    jobs: Array<{
      id: string;
      title: string;
      companyName?: string;
      location: string;
      matchScore: number;
      salaryMin?: number;
      salaryMax?: number;
      jobType?: string;
    }>
  ): Promise<EmailResponse> {
    const jobListHtml = jobs
      .slice(0, 5) // Show top 5 jobs
      .map(
        (job) => `
        <div style="background: #f8f9fa; border-left: 4px solid #14b8a6; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
            <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/jobs/${job.id}" 
               style="color: #14b8a6; text-decoration: none;">
              ${job.title}
            </a>
          </h3>
          ${job.companyName ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Company:</strong> ${job.companyName}</p>` : ''}
          <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Location:</strong> ${job.location}</p>
          ${job.salaryMin && job.salaryMax ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Salary:</strong> Rs. ${job.salaryMin.toLocaleString()} - Rs. ${job.salaryMax.toLocaleString()}</p>` : ''}
          <p style="margin: 10px 0 0 0;">
            <span style="background: #14b8a6; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${Math.round(job.matchScore)}% Match
            </span>
          </p>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Recommendations for You</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              🎯 Jobs Matched for You!
            </h1>
            <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">
              We found ${jobs.length} job${jobs.length !== 1 ? 's' : ''} that match your skills
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Based on your skills, experience, and location, we've found some great job opportunities that might interest you!
            </p>

            <!-- Job Recommendations -->
            <div style="margin: 30px 0;">
              ${jobListHtml}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/jobs" 
                 style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(20, 184, 166, 0.3);">
                View All Jobs →
              </a>
            </div>

            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
              <strong>Tip:</strong> Keep your profile updated to receive the best job matches. You can update your skills and preferences in your dashboard settings.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have job alerts enabled in your notification preferences.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: #14b8a6; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: #14b8a6; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `🎯 ${jobs.length} New Job${jobs.length !== 1 ? 's' : ''} Matched for You!`,
      html
    );
  }

  async sendSkillRecommendationEmail(
    user: EmailUser,
    data: {
      jobTitle: string;
      companyName?: string;
      missingSkills: string[];
      matchedSkills: string[];
      similarJobs: Array<{
        id: string;
        title: string;
        companyName?: string;
        location: string;
        matchScore: number;
      }>;
    }
  ): Promise<EmailResponse> {
    const missingSkillsHtml = data.missingSkills
      .map(
        (skill) => `
        <li style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
          <span style="color: #dc2626; font-weight: bold;">❌ ${skill}</span>
        </li>
      `
      )
      .join('');

    const matchedSkillsHtml = data.matchedSkills
      .map(
        (skill) => `
        <li style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">
          <span style="color: #16a34a; font-weight: bold;">✅ ${skill}</span>
        </li>
      `
      )
      .join('');

    const similarJobsHtml = data.similarJobs
      .slice(0, 3)
      .map(
        (job) => `
        <div style="background: #f8f9fa; border-left: 4px solid #14b8a6; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
            <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/jobs/${job.id}" 
               style="color: #14b8a6; text-decoration: none;">
              ${job.title}
            </a>
          </h3>
          ${job.companyName ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Company:</strong> ${job.companyName}</p>` : ''}
          <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Location:</strong> ${job.location}</p>
          <p style="margin: 10px 0 0 0;">
            <span style="background: #14b8a6; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${Math.round(job.matchScore)}% Match
            </span>
          </p>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Skills to Improve Your Profile</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              💡 Skills to Improve Your Profile
            </h1>
            <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">
              Based on your application for "${data.jobTitle}"
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              We noticed your application for <strong>"${data.jobTitle}"</strong>${data.companyName ? ` at ${data.companyName}` : ''} wasn't selected. 
              Here's what you can do to improve your chances for similar opportunities:
            </p>

            <!-- Missing Skills -->
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px;">❌ Skills You're Missing</h2>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                ${missingSkillsHtml || '<li>No specific missing skills identified</li>'}
              </ul>
              <p style="color: #666; font-size: 14px; margin: 15px 0 0 0;">
                <strong>💡 Tip:</strong> Consider learning these skills to increase your match score for similar positions.
              </p>
            </div>

            <!-- Matched Skills -->
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="color: #16a34a; margin: 0 0 15px 0; font-size: 20px;">✅ Skills You Already Have</h2>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                ${matchedSkillsHtml || '<li>No matched skills identified</li>'}
              </ul>
            </div>

            <!-- Similar Jobs -->
            ${data.similarJobs.length > 0 ? `
            <div style="margin: 30px 0;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">🎯 Similar Jobs You Can Apply For</h2>
              ${similarJobsHtml}
            </div>
            ` : ''}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/profile" 
                 style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(20, 184, 166, 0.3);">
                Update Your Skills →
              </a>
            </div>

            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
              <strong>Remember:</strong> Keep learning and updating your profile. Every skill you add increases your chances of landing your dream job!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you applied for a job on our platform.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard" style="color: #14b8a6; text-decoration: none;">Visit Dashboard</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/profile" style="color: #14b8a6; text-decoration: none;">Update Profile</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `💡 Skills to Improve: ${data.missingSkills.slice(0, 3).join(', ')}`,
      html
    );
  }

  async sendNearbyJobRecommendationEmail(
    user: EmailUser,
    jobs: Array<{
      id: string;
      title: string;
      companyName?: string;
      location: string;
      matchScore: number;
      salaryMin?: number;
      salaryMax?: number;
      jobType?: string;
      distance?: number;
    }>,
    maxDistanceKm: number = 30
  ): Promise<EmailResponse> {
    const jobListHtml = jobs
      .slice(0, 5) // Show top 5 nearby jobs
      .map(
        (job) => `
        <div style="background: #f8f9fa; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #333; font-size: 18px; flex: 1;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/jobs/${job.id}" 
                 style="color: #3b82f6; text-decoration: none;">
                ${job.title}
              </a>
            </h3>
            ${job.distance !== undefined ? `
              <span style="background: #3b82f6; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; white-space: nowrap; margin-left: 10px;">
                📍 ${job.distance.toFixed(1)} km
              </span>
            ` : ''}
          </div>
          ${job.companyName ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Company:</strong> ${job.companyName}</p>` : ''}
          <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Location:</strong> ${job.location}</p>
          ${job.salaryMin && job.salaryMax ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Salary:</strong> Rs. ${job.salaryMin.toLocaleString()} - Rs. ${job.salaryMax.toLocaleString()}</p>` : ''}
          <p style="margin: 10px 0 0 0;">
            <span style="background: #14b8a6; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${Math.round(job.matchScore)}% Match
            </span>
          </p>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nearby Jobs for You</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              📍 Nearby Jobs for You!
            </h1>
            <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">
              We found ${jobs.length} job${jobs.length !== 1 ? 's' : ''} within ${maxDistanceKm}km of your location
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Great news! We found some job opportunities near you that match your skills and location. These jobs are within ${maxDistanceKm}km of your current location, making them easily accessible!
            </p>

            <!-- Nearby Jobs -->
            <div style="margin: 30px 0;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">📍 Jobs Near You</h2>
              ${jobListHtml}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/jobs" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                View All Nearby Jobs →
              </a>
            </div>

            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
              <strong>💡 Tip:</strong> These jobs are sorted by distance (closest first) and skill match. Update your location in your profile to get more accurate recommendations!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have job alerts enabled in your notification preferences.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/profile" style="color: #3b82f6; text-decoration: none;">Update Location</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard" style="color: #3b82f6; text-decoration: none;">Visit Dashboard</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `📍 ${jobs.length} Nearby Job${jobs.length !== 1 ? 's' : ''} Within ${maxDistanceKm}km!`,
      html
    );
  }

  /**
   * Send application status update email
   */
  async sendApplicationStatusEmail(
    user: EmailUser,
    data: {
      jobTitle: string;
      companyName?: string;
      status: string;
      interviewDate?: string;
      applicationId: string;
      jobId: string;
    }
  ): Promise<EmailResponse> {
    let headerColor = '#14b8a6';
    let headerGradient = 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
    let statusIcon = '📋';
    let statusText = data.status;
    let statusColor = '#14b8a6';
    let message = `Your application status has been updated to ${data.status}`;
    let ctaText = 'View Application';
    let ctaLink = `${process.env.APP_URL || 'https://your-app.com'}/dashboard/applications`;

    if (data.status === 'ACCEPTED') {
      headerColor = '#16a34a';
      headerGradient = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
      statusIcon = '🎉';
      statusText = 'Accepted';
      statusColor = '#16a34a';
      message = `Congratulations! Your application for "${data.jobTitle}" has been accepted!`;
      ctaText = 'View Details';
    } else if (data.status === 'REJECTED') {
      headerColor = '#dc2626';
      headerGradient = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
      statusIcon = '📝';
      statusText = 'Not Selected';
      statusColor = '#dc2626';
      message = `Thank you for your interest. Unfortunately, your application for "${data.jobTitle}" was not selected at this time.`;
      ctaText = 'Explore More Jobs';
      ctaLink = `${process.env.APP_URL || 'https://your-app.com'}/dashboard/jobs`;
    } else if (data.status === 'INTERVIEW' || data.status === 'INTERVIEW_SCHEDULED') {
      headerColor = '#3b82f6';
      headerGradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      statusIcon = '📅';
      statusText = 'Interview Scheduled';
      statusColor = '#3b82f6';
      const interviewDate = data.interviewDate 
        ? new Date(data.interviewDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'TBD';
      message = `Great news! You've been selected for an interview for "${data.jobTitle}". Interview date: ${interviewDate}`;
      ctaText = 'View Interview Details';
    } else if (data.status === 'SHORTLISTED') {
      headerColor = '#f59e0b';
      headerGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      statusIcon = '⭐';
      statusText = 'Shortlisted';
      statusColor = '#f59e0b';
      message = `Good news! Your application for "${data.jobTitle}" has been shortlisted.`;
      ctaText = 'View Application';
    } else if (data.status === 'REVIEWED') {
      headerColor = '#8b5cf6';
      headerGradient = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      statusIcon = '👀';
      statusText = 'Under Review';
      statusColor = '#8b5cf6';
      message = `Your application for "${data.jobTitle}" is currently under review.`;
      ctaText = 'View Application';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Status Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: ${headerGradient}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              ${statusIcon} Application Status Update
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${data.jobTitle}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              ${message}
            </p>

            <!-- Status Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${statusColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">${statusIcon}</div>
                <div>
                  <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">Status: ${statusText}</p>
                  ${data.companyName ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;"><strong>Company:</strong> ${data.companyName}</p>` : ''}
                  ${data.interviewDate ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;"><strong>Interview Date:</strong> ${new Date(data.interviewDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</p>` : ''}
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ctaLink}" 
                 style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${ctaText} →
              </a>
            </div>

            ${data.status === 'REJECTED' ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                <strong>💡 Tip:</strong> Don't be discouraged! Keep improving your skills and applying to other opportunities. Check out our training courses to enhance your profile.
              </p>
            </div>
            ` : ''}

            ${data.status === 'ACCEPTED' ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>🎉 Congratulations!</strong> We're excited to have you on board. Please check your dashboard for next steps.
              </p>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have email notifications enabled.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${headerColor}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: ${headerColor}; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `${statusIcon} Application Status: ${statusText} - ${data.jobTitle}`,
      html
    );
  }

  /**
   * Send KYC status update email
   */
  async sendKYCStatusEmail(
    user: EmailUser,
    data: {
      kycType: 'INDIVIDUAL' | 'INDUSTRIAL';
      status: string;
      rejectionReason?: string;
    }
  ): Promise<EmailResponse> {
    let headerColor = '#14b8a6';
    let headerGradient = 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
    let statusIcon = '✅';
    let statusText = data.status;
    let message = `Your ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC has been ${data.status}`;
    let ctaText = 'View KYC Status';
    let ctaLink = `${process.env.APP_URL || 'https://your-app.com'}/dashboard/profile`;

    if (data.status === 'APPROVED') {
      headerColor = '#16a34a';
      headerGradient = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
      statusIcon = '🎉';
      statusText = 'Approved';
      message = `Congratulations! Your ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC has been approved. You can now access all platform features.`;
      ctaText = 'Go to Dashboard';
      ctaLink = `${process.env.APP_URL || 'https://your-app.com'}/dashboard`;
    } else if (data.status === 'REJECTED') {
      headerColor = '#dc2626';
      headerGradient = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
      statusIcon = '❌';
      statusText = 'Rejected';
      message = `Your ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC was rejected.`;
      if (data.rejectionReason) {
        message += ` Reason: ${data.rejectionReason}`;
      }
      ctaText = 'Resubmit KYC';
      ctaLink = `${process.env.APP_URL || 'https://your-app.com'}/kyc/${data.kycType === 'INDIVIDUAL' ? 'individual' : 'industrial'}`;
    } else if (data.status === 'RESUBMITTED') {
      headerColor = '#3b82f6';
      headerGradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      statusIcon = '📄';
      statusText = 'Resubmitted';
      message = `Your ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC has been resubmitted and is under review.`;
      ctaText = 'View Status';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KYC Status Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: ${headerGradient}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              ${statusIcon} KYC Status Update
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              ${message}
            </p>

            <!-- Status Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">${statusIcon}</div>
                <div>
                  <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">Status: ${statusText}</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;"><strong>Type:</strong> ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC</p>
                </div>
              </div>
            </div>

            ${data.status === 'REJECTED' && data.rejectionReason ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: bold;">Rejection Reason:</p>
              <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">${data.rejectionReason}</p>
            </div>
            ` : ''}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ctaLink}" 
                 style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${ctaText} →
              </a>
            </div>

            ${data.status === 'APPROVED' ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>🎉 Great news!</strong> You can now access all platform features including job applications, training courses, and more.
              </p>
            </div>
            ` : ''}

            ${data.status === 'REJECTED' ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                <strong>💡 Next Steps:</strong> Please review the rejection reason above and resubmit your KYC with the necessary corrections.
              </p>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have email notifications enabled.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${headerColor}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: ${headerColor}; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `${statusIcon} KYC ${statusText} - ${data.kycType === 'INDIVIDUAL' ? 'Individual' : 'Industrial'} KYC`,
      html
    );
  }

  /**
   * Send exam result email
   */
  async sendExamResultEmail(
    user: EmailUser,
    data: {
      examTitle: string;
      status: string;
      score?: number;
      totalMarks?: number;
      passingScore?: number;
      bookingId: string;
      examId: string;
    }
  ): Promise<EmailResponse> {
    let headerColor = '#14b8a6';
    let headerGradient = 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
    let statusIcon = '📝';
    let statusText = data.status;
    let message = `Your exam result for "${data.examTitle}" is now available.`;
    let ctaText = 'View Results';
    let ctaLink = `${process.env.APP_URL || 'https://your-app.com'}/dashboard/exams/my-bookings`;

    if (data.status === 'PASSED') {
      headerColor = '#16a34a';
      headerGradient = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
      statusIcon = '🎉';
      statusText = 'Passed';
      message = `Congratulations! You have passed the "${data.examTitle}" exam.`;
      if (data.score !== undefined && data.totalMarks !== undefined) {
        message += ` Your score: ${data.score}/${data.totalMarks}`;
      }
    } else if (data.status === 'FAILED') {
      headerColor = '#dc2626';
      headerGradient = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
      statusIcon = '📝';
      statusText = 'Failed';
      message = `Unfortunately, you did not pass the "${data.examTitle}" exam.`;
      if (data.score !== undefined && data.totalMarks !== undefined && data.passingScore !== undefined) {
        message += ` Your score: ${data.score}/${data.totalMarks} (Required: ${data.passingScore})`;
      }
      ctaText = 'View Details';
    }

    const scoreHtml = data.score !== undefined && data.totalMarks !== undefined ? `
      <div style="background: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
        <div style="text-align: center;">
          <p style="margin: 0; color: #333; font-size: 32px; font-weight: bold;">${data.score} / ${data.totalMarks}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Score</p>
          ${data.passingScore !== undefined ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Passing Score: ${data.passingScore}</p>` : ''}
        </div>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exam Result</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: ${headerGradient}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              ${statusIcon} Exam Result
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${data.examTitle}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              ${message}
            </p>

            ${scoreHtml}

            <!-- Status Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">${statusIcon}</div>
                <div>
                  <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">Status: ${statusText}</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;"><strong>Exam:</strong> ${data.examTitle}</p>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ctaLink}" 
                 style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${ctaText} →
              </a>
            </div>

            ${data.status === 'PASSED' ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>🎉 Congratulations!</strong> You have successfully passed the exam. Your certificate will be available soon.
              </p>
            </div>
            ` : ''}

            ${data.status === 'FAILED' ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                <strong>💡 Don't Give Up!</strong> You can retake this exam. Review the material and try again when you're ready.
              </p>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have email notifications enabled.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${headerColor}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: ${headerColor}; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `${statusIcon} Exam Result: ${statusText} - ${data.examTitle}`,
      html
    );
  }

  /**
   * Send certification created email
   */
  async sendCertificationCreatedEmail(
    user: EmailUser,
    data: {
      certificateTitle: string;
      category: string;
      certificateNumber: string;
      verificationCode: string;
      issuedDate: string;
      expiryDate?: string;
      certificateUrl: string;
    }
  ): Promise<EmailResponse> {
    const headerGradient = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
    const headerColor = '#16a34a';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Certification Awarded</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: ${headerGradient}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              🏆 New Certification Awarded!
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${data.certificateTitle}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Congratulations! You have been awarded a new certification. Your certificate is now available for download and verification.
            </p>

            <!-- Certificate Details Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Certificate Title:</strong></p>
                <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">${data.certificateTitle}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Category:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${data.category}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Certificate Number:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px; font-family: monospace;">${data.certificateNumber}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Verification Code:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px; font-family: monospace;">${data.verificationCode}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Issued Date:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${new Date(data.issuedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
              ${data.expiryDate ? `
              <div>
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Expiry Date:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${new Date(data.expiryDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
              ` : ''}
            </div>

            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.certificateUrl}" 
                 target="_blank"
                 style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin: 5px;">
                Download Certificate →
              </a>
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/profile" 
                 style="display: inline-block; background: #f8f9fa; color: ${headerColor}; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; border: 2px solid ${headerColor}; margin: 5px;">
                View All Certifications →
              </a>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>💡 Tip:</strong> You can share your verification code with employers to verify your certification. Keep this email for your records.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have email notifications enabled.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${headerColor}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: ${headerColor}; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `🏆 New Certification: ${data.certificateTitle}`,
      html
    );
  }

  /**
   * Send training enrollment email
   */
  async sendTrainingEnrollmentEmail(
    user: EmailUser,
    data: {
      courseTitle: string;
      courseCategory: string;
      courseMode: string;
      courseDuration: number;
      coursePrice: number;
      isFree: boolean;
      startDate?: string;
      endDate?: string;
      courseId: string;
    }
  ): Promise<EmailResponse> {
    const headerGradient = 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
    const headerColor = '#14b8a6';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Training Enrollment Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: ${headerGradient}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              🎓 Enrollment Confirmed!
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${data.courseTitle}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Great news! You have successfully enrolled in the training course. You can now start learning and track your progress.
            </p>

            <!-- Course Details Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Course Title:</strong></p>
                <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">${data.courseTitle}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Category:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${data.courseCategory}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Mode:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${data.courseMode}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Duration:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${data.courseDuration} hour${data.courseDuration !== 1 ? 's' : ''}</p>
              </div>
              ${data.startDate ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Start Date:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${new Date(data.startDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
              ` : ''}
              ${data.endDate ? `
              <div>
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>End Date:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${new Date(data.endDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
              ` : ''}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/training/${data.courseId}" 
                 style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Start Learning →
              </a>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>💡 Tip:</strong> Complete the course to earn coins and unlock new opportunities. Track your progress in your dashboard.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have email notifications enabled.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${headerColor}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: ${headerColor}; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `🎓 Enrollment Confirmed: ${data.courseTitle}`,
      html
    );
  }

  /**
   * Send training completion email
   */
  async sendTrainingCompletionEmail(
    user: EmailUser,
    data: {
      courseTitle: string;
      courseCategory: string;
      coinsAwarded: number;
      courseId: string;
    }
  ): Promise<EmailResponse> {
    const headerGradient = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
    const headerColor = '#16a34a';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Training Course Completed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: ${headerGradient}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              🎉 Course Completed!
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${data.courseTitle}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Congratulations! You have successfully completed the training course. Your dedication and hard work have paid off!
            </p>

            <!-- Completion Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                <p style="margin: 0; color: #333; font-size: 24px; font-weight: bold;">Course Completed!</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Course:</strong></p>
                <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">${data.courseTitle}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Category:</strong></p>
                <p style="margin: 0; color: #333; font-size: 16px;">${data.courseCategory}</p>
              </div>
              ${data.coinsAwarded > 0 ? `
              <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 5px; padding: 15px; margin-top: 15px; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: bold;">💰 Coins Awarded</p>
                <p style="margin: 5px 0 0 0; color: #92400e; font-size: 24px; font-weight: bold;">+${data.coinsAwarded} Coins</p>
              </div>
              ` : ''}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/training" 
                 style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Explore More Courses →
              </a>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                <strong>🎉 Well Done!</strong> You've earned ${data.coinsAwarded} coins for completing this course. Keep learning and growing!
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because you have email notifications enabled.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${headerColor}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}" style="color: ${headerColor}; text-decoration: none;">Visit Platform</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `🎉 Course Completed: ${data.courseTitle}`,
      html
    );
  }

  /**
   * Send urgent job notification email
   */
  async sendUrgentJobNotificationEmail(
    user: EmailUser,
    data: {
      jobId: string;
      title: string;
      description: string;
      category: string;
      paymentAmount: number;
      paymentType: string;
      urgencyLevel: string;
      location: string;
      distance: number;
      startTime: string;
      contactPhone?: string;
      posterName?: string;
    }
  ): Promise<EmailResponse> {
    const urgencyColors: Record<string, { bg: string; text: string }> = {
      CRITICAL: { bg: '#dc2626', text: '#ffffff' },
      HIGH: { bg: '#ea580c', text: '#ffffff' },
      MEDIUM: { bg: '#f59e0b', text: '#ffffff' },
      LOW: { bg: '#3b82f6', text: '#ffffff' },
    };

    const urgencyColor = urgencyColors[data.urgencyLevel] || urgencyColors.MEDIUM;
    const formattedPayment = `Rs. ${data.paymentAmount.toLocaleString()}`;
    const startDate = new Date(data.startTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Urgent Job Near You!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${urgencyColor.bg} 0%, ${urgencyColor.bg}dd 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              ⚡ Urgent Job Near You!
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              Only ${data.distance.toFixed(1)}km away
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hi ${user.firstName || 'there'},
            </p>
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Great news! An urgent job has been posted near your location. This could be a perfect opportunity for you!
            </p>

            <!-- Job Details Card -->
            <div style="background: #f8f9fa; border-left: 4px solid ${urgencyColor.bg}; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #333; font-size: 22px;">
                ${data.title}
              </h2>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; color: #666; font-size: 14px;">
                  <strong style="color: #333;">📍 Location:</strong> ${data.location}
                </p>
                <p style="margin: 8px 0; color: #666; font-size: 14px;">
                  <strong style="color: #333;">📏 Distance:</strong> ${data.distance.toFixed(1)} km away
                </p>
                <p style="margin: 8px 0; color: #666; font-size: 14px;">
                  <strong style="color: #333;">💰 Payment:</strong> ${formattedPayment} (${data.paymentType})
                </p>
                <p style="margin: 8px 0; color: #666; font-size: 14px;">
                  <strong style="color: #333;">⏰ Start Time:</strong> ${startDate}
                </p>
                <p style="margin: 8px 0; color: #666; font-size: 14px;">
                  <strong style="color: #333;">📂 Category:</strong> ${data.category}
                </p>
                ${data.posterName ? `
                <p style="margin: 8px 0; color: #666; font-size: 14px;">
                  <strong style="color: #333;">👤 Posted by:</strong> ${data.posterName}
                </p>
                ` : ''}
              </div>

              <div style="margin: 15px 0 0 0;">
                <span style="background: ${urgencyColor.bg}; color: ${urgencyColor.text}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${data.urgencyLevel} URGENCY
                </span>
              </div>
            </div>

            <!-- Description -->
            <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">📝 Description:</h3>
              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                ${data.description}
              </p>
            </div>

            ${data.contactPhone ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>📞 Contact:</strong> <a href="tel:${data.contactPhone}" style="color: #1e40af; text-decoration: none;">${data.contactPhone}</a>
              </p>
            </div>
            ` : ''}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/urgent-jobs/${data.jobId}" 
                 style="display: inline-block; background: linear-gradient(135deg, ${urgencyColor.bg} 0%, ${urgencyColor.bg}dd 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);">
                Apply Now →
              </a>
            </div>

            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
              <strong>💡 Tip:</strong> Urgent jobs fill up quickly! Apply as soon as possible to secure your spot. This job is within 10km of your location, making it easily accessible.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
              You're receiving this because an urgent job was posted within 10km of your location.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/settings" style="color: ${urgencyColor.bg}; text-decoration: none;">Manage Preferences</a> | 
              <a href="${process.env.APP_URL || 'https://your-app.com'}/dashboard/urgent-jobs" style="color: ${urgencyColor.bg}; text-decoration: none;">View All Urgent Jobs</a>
            </p>
            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
              © ${new Date().getFullYear()} HR Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(
      user.email ?? '',
      `⚡ Urgent Job Near You: ${data.title} (${data.distance.toFixed(1)}km away)`,
      html
    );
  }

  async verifyTransport(): Promise<boolean> {
    try {
      if (this.useResend && this.resendClient) {
        console.log('✅ Resend configured as primary service');
      }

      if (this.useSendGrid) {
        console.log('✅ SendGrid configured as ' + (this.useResend ? 'secondary' : 'primary') + ' service');
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
