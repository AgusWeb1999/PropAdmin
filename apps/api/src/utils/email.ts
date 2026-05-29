import { Resend } from 'resend';
import { env } from '../config';

// Lazy init — only creates client if API key is set
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

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
  const resend = getResend();
  if (!resend) return;

  const formattedAmount = `$${data.amount.toLocaleString('es-UY')}`;
  const formattedDate = new Intl.DateTimeFormat('es-UY', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(data.date);

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: data.to,
    subject: `Recibo de pago — ${data.buildingName} Apt ${data.aptNumber}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 12px 0 4px;">${data.companyName}</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Recibo de pago</p>
        </div>
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase;">Residente</p>
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
            <td style="padding: 10px 0; text-align: right; color: #0f172a; font-size: 14px;">${data.reference}</td>
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
    }],
  });
}

export async function sendDebtNotificationEmail(data: {
  to: string;
  residentName: string;
  buildingName: string;
  aptNumber: string;
  companyName: string;
  totalDebt: number;
  chargeCount: number;
  currency: string;
  pdfBuffer: Buffer;
}) {
  const resend = getResend();
  if (!resend) return;

  const fmt = (n: number) => `${data.currency} ${n.toLocaleString('es-UY')}`;
  const today = new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: data.to,
    subject: `Estado de cuenta — ${data.buildingName} Apt ${data.aptNumber}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 12px 0 4px;">${data.companyName}</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Estado de cuenta — ${today}</p>
        </div>
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase;">Residente</p>
          <p style="margin: 0; color: #0f172a; font-weight: 600; font-size: 16px;">${data.residentName}</p>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">${data.buildingName} · Apartamento ${data.aptNumber}</p>
        </div>
        <div style="background: #fef2f2; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 4px; color: #ef4444; font-size: 12px; text-transform: uppercase;">Saldo pendiente</p>
          <p style="margin: 0; color: #dc2626; font-weight: 700; font-size: 28px;">${fmt(data.totalDebt)}</p>
          <p style="margin: 4px 0 0; color: #f87171; font-size: 13px;">${data.chargeCount} cargo${data.chargeCount !== 1 ? 's' : ''} pendiente${data.chargeCount !== 1 ? 's' : ''}</p>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0 0 8px;">
          El estado de cuenta detallado está adjunto como PDF.
        </p>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          Ante cualquier consulta, comunicate con la administración.
        </p>
      </div>
    `,
    attachments: [{
      filename: `estado-cuenta-apt${data.aptNumber}.pdf`,
      content: data.pdfBuffer,
    }],
  });
}
