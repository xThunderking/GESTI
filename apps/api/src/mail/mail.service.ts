import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const host = configService.getOrThrow<string>('SMTP_HOST');
    const port = Number(configService.getOrThrow<string>('SMTP_PORT'));
    const secure = configService.get<string>('SMTP_SECURE') === 'true';
    const user = configService.get<string>('SMTP_USER');
    const password = configService.get<string>('SMTP_PASSWORD');
    this.from = configService.getOrThrow<string>('SMTP_FROM');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  async sendTemporaryPassword(input: { email: string; name: string; temporaryPassword: string }) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.email,
        subject: 'Tu acceso temporal a GESTI',
        text: [
          `Hola ${input.name},`,
          '',
          'Se creo tu cuenta en GESTI.',
          `Correo: ${input.email}`,
          `Contrasena temporal: ${input.temporaryPassword}`,
          '',
          'Al iniciar sesion deberas crear una contrasena personal.',
          'No compartas este mensaje ni tu contrasena.',
        ].join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;color:#18212f">
            <h1 style="font-size:22px">Acceso a GESTI</h1>
            <p>Hola ${this.escapeHtml(input.name)},</p>
            <p>Se creo tu cuenta en el sistema de gestion del departamento de TI.</p>
            <p><strong>Correo:</strong> ${this.escapeHtml(input.email)}</p>
            <p><strong>Contrasena temporal:</strong></p>
            <p style="font-family:monospace;font-size:18px;padding:12px;background:#f1f5f9;border-radius:4px">
              ${this.escapeHtml(input.temporaryPassword)}
            </p>
            <p>Al iniciar sesion deberas crear una contrasena personal.</p>
            <p>No compartas este mensaje ni tu contrasena.</p>
          </div>
        `,
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible enviar el correo. Verifica la configuracion SMTP.',
      );
    }
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
