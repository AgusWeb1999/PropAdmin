import PDFDocument from 'pdfkit';

type ReceiptData = {
  id: string;
  amount: number | string;
  method: string;
  reference?: string | null;
  date: Date;
  notes?: string | null;
  resident: {
    firstName: string;
    lastName: string;
    apartment: {
      number: string;
      building: {
        name: string;
        address: string;
        company: { name: string };
      };
    };
  };
  paymentCharges: Array<{
    amount: number | string;
    charge: { description: string; period: string; amount: number | string };
  }>;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia bancaria',
  CHECK: 'Cheque',
  ONLINE: 'Pago online',
  OTHER: 'Otro',
};

export function generateReceipt(data: ReceiptData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const company = data.resident.apartment.building.company;
  const building = data.resident.apartment.building;
  const resident = data.resident;

  // ── Header ────────────────────────────────────────
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(company.name, { align: 'center' })
    .moveDown(0.3);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Edificio: ${building.name} — ${building.address}`, { align: 'center' })
    .moveDown(1);

  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('RECIBO DE PAGO', { align: 'center' })
    .moveDown(0.5);

  // ── Divider ───────────────────────────────────────
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  // ── Payment details ───────────────────────────────
  const left = 50;
  const right = 300;
  const lineH = 20;
  let y = doc.y;

  const field = (label: string, value: string, col = left) => {
    doc.font('Helvetica-Bold').fontSize(10).text(label, col, y);
    doc.font('Helvetica').fontSize(10).text(value, col + 120, y);
    y += lineH;
  };

  field('Recibo N°:', data.id.slice(-8).toUpperCase());
  field('Fecha:', new Date(data.date).toLocaleDateString('es-UY'));
  field('Residente:', `${resident.firstName} ${resident.lastName}`);
  field('Apartamento:', resident.apartment.number);
  field('Método de pago:', METHOD_LABELS[data.method] || data.method);
  if (data.reference) field('Referencia:', data.reference);

  doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  // ── Charges table ─────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(11).text('Detalle de cargos aplicados', left, doc.y).moveDown(0.5);

  if (data.paymentCharges.length > 0) {
    for (const pc of data.paymentCharges) {
      doc
        .font('Helvetica').fontSize(10)
        .text(`• ${pc.charge.description} (${pc.charge.period})`, left, doc.y, { width: 360 })
        .font('Helvetica-Bold')
        .text(`$${Number(pc.amount).toLocaleString('es-UY')}`, 420, doc.y, { align: 'right' })
        .moveDown(0.3);
    }
  }

  doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  // ── Total ─────────────────────────────────────────
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('TOTAL PAGADO:', left, doc.y)
    .text(`$${Number(data.amount).toLocaleString('es-UY')}`, 420, doc.y, { align: 'right' })
    .moveDown(2);

  if (data.notes) {
    doc.fontSize(9).font('Helvetica').text(`Obs: ${data.notes}`, left);
  }

  // ── Footer ────────────────────────────────────────
  doc
    .fontSize(8)
    .font('Helvetica')
    .text('Este recibo es comprobante válido de pago.', left, 750, { align: 'center' });

  return doc;
}

export function generateAccountStatement(data: {
  apartment: {
    number: string;
    building: { name: string; address: string; company: { name: string } };
    residents: Array<{ firstName: string; lastName: string }>;
    charges: Array<{
      description: string;
      period: string;
      amount: number | string;
      interestAmount: number | string;
      status: string;
      dueDate: Date;
    }>;
  };
}): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const { apartment } = data;
  const resident = apartment.residents[0];

  doc.fontSize(18).font('Helvetica-Bold').text(apartment.building.company.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`${apartment.building.name} — ${apartment.building.address}`, { align: 'center' }).moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text('ESTADO DE CUENTA', { align: 'center' }).moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  if (resident) {
    doc.fontSize(10).font('Helvetica')
      .text(`Residente: ${resident.firstName} ${resident.lastName}   |   Apt: ${apartment.number}`)
      .moveDown(0.5);
  }

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  // Table header
  const cols = [50, 200, 310, 400, 490];
  doc.font('Helvetica-Bold').fontSize(9);
  ['Período', 'Descripción', 'Importe', 'Interés', 'Estado'].forEach((h, i) => {
    doc.text(h, cols[i], doc.y, { width: 100 });
  });
  doc.moveDown(0.3).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);

  let totalDebt = 0;
  for (const charge of apartment.charges) {
    const total = Number(charge.amount) + Number(charge.interestAmount);
    if (charge.status !== 'PAID') totalDebt += total;

    const y = doc.y;
    doc.font('Helvetica').fontSize(9);
    doc.text(charge.period, cols[0], y, { width: 145 });
    doc.text(charge.description, cols[1], y, { width: 105 });
    doc.text(`$${Number(charge.amount).toLocaleString('es-UY')}`, cols[2], y, { width: 85 });
    doc.text(`$${Number(charge.interestAmount).toLocaleString('es-UY')}`, cols[3], y, { width: 85 });
    doc.text(charge.status, cols[4], y, { width: 80 });
    doc.moveDown(0.4);
  }

  doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold')
    .text('SALDO ADEUDADO:', 50, doc.y)
    .text(`$${totalDebt.toLocaleString('es-UY')}`, 420, doc.y, { align: 'right' });

  return doc;
}
