const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // For development/testing, use Ethereal Email (fake SMTP service)
      if (!process.env.SMTP_HOST) {
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        logger.info('Email service initialized with Ethereal (test account)');
        logger.info(`Preview emails at: https://ethereal.email/`);
      } else {
        // Production configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        
        logger.info('Email service initialized with production SMTP');
      }
      
      // Verify the connection
      await this.transporter.verify();
      this.initialized = true;
      logger.info('Email service connection verified');
      
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      // Fallback to console logging
      this.transporter = null;
      this.initialized = false;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ShareWell <noreply@sharewell.com>',
      to,
      subject,
      html: htmlContent,
      text: textContent || this.htmlToText(htmlContent),
    };

    try {
      if (this.transporter) {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info('Email sent successfully:', {
          messageId: info.messageId,
          to,
          subject,
          preview: info.preview || 'N/A'
        });
        
        // For development, log preview URL
        if (info.preview) {
          console.log('\n📧 Email Preview URL:', info.preview);
        }
        
        return { success: true, messageId: info.messageId, preview: info.preview };
      } else {
        // Fallback: log to console
        logger.warn('Email service not available, logging email to console:', {
          to,
          subject,
          content: htmlContent
        });
        console.log('\n📧 EMAIL FALLBACK:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content:\n${textContent || this.htmlToText(htmlContent)}`);
        
        return { success: true, messageId: 'console-fallback' };
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to, resetToken, username) {
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>You requested a password reset for your ShareWell account. Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The ShareWell Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Password Reset Request

      Hi ${username},

      You requested a password reset for your ShareWell account. 
      
      Reset your password by visiting: ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The ShareWell Team
    `;

    return await this.sendEmail(to, 'Reset Your ShareWell Password', htmlContent, textContent);
  }

  async sendUsernameReminder(to, username) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .username { background: #e8f2ff; padding: 15px; border-radius: 5px; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Username Reminder</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You requested a username reminder for your ShareWell account. Your username is:</p>
            <div class="username">${username}</div>
            <p>You can now use this username to log in to your account.</p>
            <p>If you didn't request this information, please ignore this email.</p>
            <p>Best regards,<br>The ShareWell Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Username Reminder

      Hello,

      You requested a username reminder for your ShareWell account. 
      
      Your username is: ${username}
      
      You can now use this username to log in to your account.
      
      If you didn't request this information, please ignore this email.
      
      Best regards,
      The ShareWell Team
    `;

    return await this.sendEmail(to, 'Your ShareWell Username', htmlContent, textContent);
  }

  async sendWelcomeEmail(to, username) {
    const loginUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ShareWell!</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Welcome to ShareWell! Your account has been successfully created.</p>
            <p>ShareWell helps you create and share engaging LinkedIn content across your organization. Here's what you can do:</p>
            <ul>
              <li>📝 Create and manage content posts</li>
              <li>🚀 Share posts directly to LinkedIn</li>
              <li>🏆 Earn points and track your activity</li>
              <li>📊 Monitor your posting performance</li>
            </ul>
            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Start Using ShareWell</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The ShareWell Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Welcome to ShareWell!

      Hi ${username},

      Welcome to ShareWell! Your account has been successfully created.

      ShareWell helps you create and share engaging LinkedIn content across your organization. Here's what you can do:

      - Create and manage content posts
      - Share posts directly to LinkedIn  
      - Earn points and track your activity
      - Monitor your posting performance

      Start using ShareWell: ${loginUrl}

      If you have any questions, feel free to reach out to our support team.

      Best regards,
      The ShareWell Team
    `;

    return await this.sendEmail(to, 'Welcome to ShareWell!', htmlContent, textContent);
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = new EmailService();
