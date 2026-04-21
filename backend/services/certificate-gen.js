const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '..', 'generated');

// Ensure generated directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

/**
 * Generate a professional certificate PDF
 */
function generateCertificate(studentData, certificateUid) {
  return new Promise((resolve, reject) => {
    const filename = `certificate-${certificateUid}.pdf`;
    const filepath = path.join(GENERATED_DIR, filename);

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const width = doc.page.width;
    const height = doc.page.height;

    // Background
    doc.rect(0, 0, width, height).fill('#FAFAF8');

    // Decorative border
    const borderMargin = 25;
    doc.lineWidth(3)
      .rect(borderMargin, borderMargin, width - borderMargin * 2, height - borderMargin * 2)
      .stroke('#1a365d');

    doc.lineWidth(1)
      .rect(borderMargin + 6, borderMargin + 6, width - (borderMargin + 6) * 2, height - (borderMargin + 6) * 2)
      .stroke('#c9a84c');

    // Corner decorations
    const corners = [
      [borderMargin + 15, borderMargin + 15],
      [width - borderMargin - 15, borderMargin + 15],
      [borderMargin + 15, height - borderMargin - 15],
      [width - borderMargin - 15, height - borderMargin - 15],
    ];
    for (const [cx, cy] of corners) {
      doc.circle(cx, cy, 5).fill('#c9a84c');
    }

    // Header - Institution Name
    doc.fontSize(14)
      .font('Helvetica')
      .fillColor('#666666')
      .text(studentData.institution.toUpperCase(), 0, 60, { align: 'center', width });

    // Decorative line
    const lineY = 90;
    doc.moveTo(width / 2 - 120, lineY).lineTo(width / 2 + 120, lineY).lineWidth(1).stroke('#c9a84c');

    // "Certificate of Achievement" title
    doc.fontSize(36)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text('CERTIFICATE', 0, 110, { align: 'center', width });

    doc.fontSize(16)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text('OF ACHIEVEMENT', 0, 152, { align: 'center', width });

    // "This is to certify that"
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text('This is to certify that', 0, 195, { align: 'center', width });

    // Student Name
    doc.fontSize(32)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text(studentData.name, 0, 220, { align: 'center', width });

    // Decorative line under name
    const nameLineY = 260;
    doc.moveTo(width / 2 - 160, nameLineY).lineTo(width / 2 + 160, nameLineY).lineWidth(0.5).stroke('#c9a84c');

    // "has successfully completed"
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text('has successfully completed the requirements for the degree of', 0, 275, { align: 'center', width });

    // Degree
    doc.fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text(studentData.degree, 0, 300, { align: 'center', width });

    // Graduation year
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Awarded in the year ${studentData.graduation_year}`, 0, 335, { align: 'center', width });

    // Certificate ID
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#999999')
      .text(`Certificate ID: ${certificateUid}`, 0, 365, { align: 'center', width });

    // Signature lines
    const sigY = 410;
    // Left signature
    doc.moveTo(width / 4 - 80, sigY).lineTo(width / 4 + 80, sigY).lineWidth(0.5).stroke('#333');
    doc.fontSize(10).font('Helvetica').fillColor('#4a5568')
      .text('Registrar', width / 4 - 80, sigY + 5, { width: 160, align: 'center' });

    // Right signature
    doc.moveTo((3 * width) / 4 - 80, sigY).lineTo((3 * width) / 4 + 80, sigY).lineWidth(0.5).stroke('#333');
    doc.fontSize(10).font('Helvetica').fillColor('#4a5568')
      .text('Vice Chancellor', (3 * width) / 4 - 80, sigY + 5, { width: 160, align: 'center' });

    // Date
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(9).font('Helvetica').fillColor('#999999')
      .text(`Date of Issue: ${today}`, 0, sigY + 35, { align: 'center', width });

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
      .text('This certificate is digitally verified through the Zequen Verification System', 0, height - 55, { align: 'center', width });

    doc.end();

    stream.on('finish', () => {
      resolve({ filepath, filename });
    });

    stream.on('error', reject);
  });
}

module.exports = { generateCertificate, GENERATED_DIR };
