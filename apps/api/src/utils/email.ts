import nodemailer from 'nodemailer';
import { env } from '../config';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia bancaria',
  CHECK: 'Cheque',
  ONLINE: 'Pago online',
  OTHER: 'Otro',
};

export async function sendReceiptEmail(data: {
  to: string;
  residentName: string;
  buildingName: string;
  aptNumber: string;
  amount: number;
  date: Date;
  reference?: string | null;
  method: string;
  companyName: string;
  pdfBuffer: Buffer;
  paymentId: string;
}) {
  // Skip silently if SMTP not configured
  if (!env.SMTP_USER || !env.SMTP_PASS) return;

  const formattedAmount = `$${data.amount.toLocaleString('es-UY')}`;
  const formattedDate = new Intl.DateTimeFormat('es-UY', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(data.date);

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: data.to,
    subject: `Recibo de pago — ${data.buildingName} Apt ${data.aptNumber}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #0f172a; color: white; width: 40px; height: 40px; border-radius: 10px; line-height: 40px; font-size: 20px; text-align: center;">🏢</div>
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 12px 0 4px;">${data.companyName}</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Recibo de pago</p>
        </div>

        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Residente</p>
          <p style="margin: 0; color: #0f172a; font-weight: 600; font-size: 16px;">${data.residentName}</p>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">${data.buildingName} · Apartamento ${data.aptNumber}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Monto pagado</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #059669; font-size: 20px; border-bottom: 1px solid #f1f5f9;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Fecha</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Método</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-size: 14px;">${METHOD_LABELS[data.method] ?? data.method}</td>
          </tr>
          ${data.reference ? `
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">Referencia</td>
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-size: 14px; border-top: 1px solid #f1f5f9;">${data.reference}</td>
          </tr>` : ''}
        </table>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          El recibo en PDF está adjunto a este correo.<br>
          Recibo N° ${data.paymentId.slice(-8).toUpperCase()}
        </p>
      </div>
    `,
    attachments: [{
      filename: `recibo-${data.paymentId.slice(-8).toUpperCase()}.pdf`,
      content: data.pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}
