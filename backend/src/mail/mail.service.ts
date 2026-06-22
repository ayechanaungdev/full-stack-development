import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASSWORD || '';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const subject = 'Your Car Rental App Verification Code';
    const text = `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`;

    // Always log to console for development
    console.log(`\n========================================`);
    console.log(`📧 Verification code for ${email}: ${code}`);
    console.log(`========================================\n`);

    if (this.transporter) {
      await this.transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@carrental.app', to: email, subject, text });
    }
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const subject = 'Your Car Rental App Password Reset Code';
    const text = `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.`;

    console.log(`\n========================================`);
    console.log(`🔑 Password reset code for ${email}: ${code}`);
    console.log(`========================================\n`);

    if (this.transporter) {
      await this.transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@carrental.app', to: email, subject, text });
    }
  }
}
