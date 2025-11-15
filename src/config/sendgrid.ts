import sgMail from '@sendgrid/mail';
import { emailConfig } from './env';

// Set SendGrid API key if available
if (emailConfig.sendgridApiKey) {
  sgMail.setApiKey(emailConfig.sendgridApiKey);
}

/**
 * Test SendGrid connection
 */
export const testSendGridConnection = async (): Promise<boolean> => {
  if (!emailConfig.sendgridApiKey) {
    return false;
  }

  try {
    // SendGrid doesn't have a verify method, so we'll test by checking API key format
    if (emailConfig.sendgridApiKey.startsWith('SG.')) {
      console.log('✅ SendGrid configured (fallback email service)');
      console.log(`📧 SendGrid From: ${emailConfig.sendgridFrom}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('❌ SendGrid configuration failed:', error.message || error);
    return false;
  }
};

/**
 * Send email via SendGrid
 */
export const sendEmailViaSendGrid = async (
  to: string,
  subject: string,
  html: string
): Promise<any> => {
  if (!emailConfig.sendgridApiKey) {
    throw new Error('SendGrid API key not configured');
  }

  const msg = {
    to,
    from: emailConfig.sendgridFrom!,
    subject,
    html,
  };

  try {
    const result = await sgMail.send(msg);
    return result;
  } catch (error: any) {
    throw new Error(`SendGrid send failed: ${error.message || error}`);
  }
};

export default sgMail;

