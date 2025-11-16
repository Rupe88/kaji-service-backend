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

  // Check if API key is not empty (actual validation happens when sending emails)
  if (emailConfig.sendgridApiKey.trim().length === 0) {
    console.warn('⚠️  SendGrid API key is empty');
    return false;
  }

  try {
    // SendGrid doesn't have a verify method, so we just check if API key exists
    // The actual validation will happen when we try to send an email
    console.log('✅ SendGrid configured');
    console.log(`📧 SendGrid From: ${emailConfig.sendgridFrom}`);
    return true;
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

  if (!emailConfig.sendgridFrom) {
    throw new Error('SendGrid from email not configured');
  }

  const msg = {
    to,
    from: emailConfig.sendgridFrom,
    subject,
    html,
  };

  try {
    const result = await sgMail.send(msg);
    return result;
  } catch (error: any) {
    // Log detailed error information
    console.error('❌ SendGrid send error details:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.response) {
      const { body, statusCode } = error.response;
      console.error('   Status Code:', statusCode);
      console.error('   Response Body:', JSON.stringify(body, null, 2));
      
      // Common SendGrid errors
      if (body?.errors) {
        body.errors.forEach((err: any) => {
          console.error(`   - ${err.message} (field: ${err.field || 'N/A'})`);
        });
      }
    }
    
    // Provide more helpful error message
    let errorMessage = `SendGrid send failed: ${error.message || error}`;
    if (error.response?.body?.errors?.[0]?.message) {
      errorMessage += ` - ${error.response.body.errors[0].message}`;
    }
    
    throw new Error(errorMessage);
  }
};

export default sgMail;

