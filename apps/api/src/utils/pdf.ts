import PDFDocument from 'pdfkit';

export type ReceiptData = {
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

// ── Shared content writer ──────────────────────────────────────────────────
function writeReceiptContent(doc: PDFKit.PDFDocument, data: ReceiptData) {
  const company = data.resident.apartment.building.company;
  const building = data.resident.apartment.building;
  const resident = data.resident;

  doc.fontSize(20).font('Helvetica-Bold').text(company.name, { align: 'center' }).moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(`Edificio: ${building.name} — ${building.address}`, { align: 'center' }).moveDown(1);
  doc.fontSize(16).font('Helvetica-Bold').text('RECIBO DE PAGO', { align: 'center' }).moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  const left = 50;
  const lineH = 20;
  let y = doc.y;

  const field = (label: string, value: string) => {
    doc.font('Helvetica-Bold').fontSize(10).text(label, left, y);
    doc.font('Helvetica').fontSize(10).text(value, left + 120, y);
    y += lineH;
  };

  field('Recibo N°:', data.id.slice(-8).toUpperCase());
  field('Fecha:', new Date(data.date).toLocaleDateString('es-UY'));
  field('Residente:', `${resident.firstName} ${resident.lastName}`);
  field('Apartamento:', resident.apartment.number);
  field('Método de pago:', METHOD_LABELS[data.method] || data.method);
  if (data.reference) field('Referencia:', data.reference);

  doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).text('Detalle de cargos aplicados', left, doc.y).moveDown(0.5);

  if (data.paymentCharges.length > 0) {
    for (const pc of data.paymentCharges) {
      doc.font('Helvetica').fontSize(10)
        .text(`• ${pc.charge.description} (${pc.charge.period})`, left, doc.y, { width: 360 })
        .font('Helvetica-Bold')
        .text(`$${Number(pc.amount).toLocaleString('es-UY')}`, 420, doc.y, { align: 'right' })
        .moveDown(0.3);
    }
  }

  doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold')
    .text('TOTAL PAGADO:', left, doc.y)
    .text(`$${Number(data.amount).toLocaleString('es-UY')}`, 420, doc.y, { align: 'right' })
    .moveDown(2);

  if (data.notes) doc.fontSize(9).font('Helvetica').text(`Obs: ${data.notes}`, left);
  doc.fontSize(8).font('Helvetica').text('Este recibo es comprobante válido de pago.', left, 750, { align: 'center' });
}

// ── Returns stream (for HTTP response) ────────────────────────────────────
export function generateReceipt(data: ReceiptData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  writeReceiptContent(doc, data);
  return doc;
}

// ── Returns buffer (for email attachment) ─────────────────────────────────
export function generateReceiptBuffer(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    writeReceiptContent(doc, data);
    doc.end();
  });
}

// ── Debt Report (all apartments in a building) ────────────────────────────
export type DebtReportData = {
  building: {
    name: string;
    address: string;
    city: string;
    currency: string;
    company: { name: string };
  };
  apartments: Array<{
    number: string;
    floor: string | null;
    resident: string | null;
    charges: Array<{
      description: string;
      period: string;
      amount: number;
      interestAmount: number;
      status: string;
      dueDate: Date;
    }>;
  }>;
};

export function generateDebtReport(data: DebtReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const { building } = data;
  const currency = building.currency ?? 'UYU';
  const fmt = (n: number) => `${currency} ${n.toLocaleString('es-UY', { minimumFractionDigits: 0 })}`;
  const today = new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' });

  // Header
  doc.fontSize(16).font('Helvetica-Bold').text(building.company.name, { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#666')
    .text(`${building.name} — ${building.address}, ${building.city}`, { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(`Generado el ${today}`, { align: 'center' }).fillColor('#000');
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text('REPORTE DE DEUDAS — GASTOS COMUNES', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#000').stroke().moveDown(0.6);

  // Table header
  const cols = { apt: 40, floor: 80, resident: 120, desc: 240, period: 355, principal: 415, interest: 468, total: 515 };
  const rowH = 14;

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#444');
  doc.text('APT', cols.apt, doc.y, { width: 35 });
  doc.text('PISO', cols.floor, doc.y, { width: 35 });
  doc.text('RESIDENTE', cols.resident, doc.y, { width: 115 });
  doc.text('DESCRIPCIÓN', cols.desc, doc.y, { width: 110 });
  doc.text('PERÍODO', cols.period, doc.y, { width: 55 });
  doc.text('PRINCIPAL', cols.principal, doc.y, { width: 48, align: 'right' });
  doc.text('INTERÉS', cols.interest, doc.y, { width: 42, align: 'right' });
  doc.text('TOTAL', cols.total, doc.y, { width: 40, align: 'right' });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke().moveDown(0.3);
  doc.fillColor('#000');

  let grandTotal = 0;
  let rowIndex = 0;

  for (const apt of data.apartments) {
    const pendingCharges = apt.charges.filter(c => c.status !== 'PAID');
    if (pendingCharges.length === 0) continue;

    const aptTotal = pendingCharges.reduce((s, c) => s + c.amount + c.interestAmount, 0);
    grandTotal += aptTotal;

    const startY = doc.y;
    const aptLabel = apt.number;
    const floorLabel = apt.floor ?? '—';
    const residentLabel = apt.resident ?? '—';

    // Alternating row bg
    if (rowIndex % 2 === 0) {
      doc.rect(40, startY - 2, 515, pendingCharges.length * rowH + 4).fillColor('#f8f8f8').fill();
      doc.fillColor('#000');
    }

    pendingCharges.forEach((charge, idx) => {
      const y = startY + idx * rowH;
      doc.font('Helvetica').fontSize(8);
      if (idx === 0) {
        doc.text(aptLabel, cols.apt, y, { width: 35 });
        doc.text(floorLabel, cols.floor, y, { width: 35 });
        doc.text(residentLabel, cols.resident, y, { width: 115 });
      }
      doc.text(charge.description, cols.desc, y, { width: 110 });
      doc.text(charge.period, cols.period, y, { width: 55 });
      doc.font('Helvetica').fontSize(8)
        .text(fmt(charge.amount), cols.principal, y, { width: 48, align: 'right' });
      doc.text(
        charge.interestAmount > 0 ? fmt(charge.interestAmount) : '—',
        cols.interest, y, { width: 42, align: 'right' }
      );
      doc.font(idx === pendingCharges.length - 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
        .text(idx === pendingCharges.length - 1 ? fmt(aptTotal) : '', cols.total, y, { width: 40, align: 'right' });
    });

    doc.y = startY + pendingCharges.length * rowH + 4;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#eee').stroke();
    doc.moveDown(0.2);
    rowIndex++;

    // New page if needed
    if (doc.y > 750) doc.addPage();
  }

  // Footer total
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#000').stroke().moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold')
    .text('TOTAL DEUDA PENDIENTE:', 40, doc.y)
    .text(fmt(grandTotal), 0, doc.y, { align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').fillColor('#888')
    .text(`Incluye solo cargos pendientes (PENDING, OVERDUE, PARTIAL) al ${today}`, { align: 'center' });

  return doc;
}

// ── Account Statement ─────────────────────────────────────────────────────
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
