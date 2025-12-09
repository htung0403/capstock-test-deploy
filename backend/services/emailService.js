/*
  File: services/emailService.js
  Purpose: Email service for sending password reset emails.
  For development: logs to console. For production: can be extended to use nodemailer.
*/

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full URL to reset password page
 */
async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  // For development: log to console
  if (process.env.NODE_ENV !== 'production' || !process.env.EMAIL_SERVICE_ENABLED) {
    console.log('='.repeat(60));
    console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your Password - Stock Cap`);
    console.log('');
    console.log(`Click the link below to reset your password:`);
    console.log(`${resetUrl}`);
    console.log('');
    console.log(`Or use this token manually: ${resetToken}`);
    console.log(`(Token expires in 1 hour)`);
    console.log('='.repeat(60));
    return { success: true };
  }

  // For production: use nodemailer or other email service
  // Example with nodemailer (uncomment and configure):
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@stockcap.com',
    to: email,
    subject: 'Reset Your Password - Stock Cap',
    html: `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
  */
  
  return { success: true };
}

module.exports = {
  sendPasswordResetEmail,
};

