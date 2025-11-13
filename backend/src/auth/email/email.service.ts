import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  /**
   * 인증번호 이메일 발송
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get('EMAIL_FROM'),
        subject: '[XYLO] Your Verification Code',
        html: this.getVerificationTemplate(code),
      });

      this.logger.log(`Verification code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email}:`, error);
      throw error;
    }
  }

  /**
   * 인증번호 이메일 템플릿
   */
  private getVerificationTemplate(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .code-box {
            background: #f8f9fa;
            border: 2px dashed #667eea;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #667eea;
            font-family: 'Courier New', monospace;
          }
          .info {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info strong {
            color: #856404;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 XYLO Fans</h1>
            <p>Email Verification</p>
          </div>

          <div class="content">
            <p>Hello,</p>
            <p>You requested to recover your XYLO account. Please use the verification code below:</p>

            <div class="code-box">
              <div class="code">${code}</div>
            </div>

            <div class="info">
              <strong>⏰ This code will expire in 15 minutes.</strong>
            </div>

            <p>Enter this code in the verification page to continue.</p>

            <p>If you didn't request this code, please ignore this email. Your account is safe.</p>
          </div>

          <div class="footer">
            <p>© 2025 XYLO Fans. All rights reserved.</p>
            <p>WITCHES Community Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
