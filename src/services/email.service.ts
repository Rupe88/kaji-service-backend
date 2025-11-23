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
