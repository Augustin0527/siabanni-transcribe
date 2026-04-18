/**
 * Siabanni Transcribe — Service d'export (Word, PDF, TXT)
 * Consortium SFR
 */

const path = require('path');
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageOrientation, Header, Footer, PageNumber, LevelFormat, BorderStyle,
} = require('docx');
const PDFDocument = require('pdfkit');

function sanitizeFilename(name) {
  return name.replace(/[\/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').slice(0, 80);
}

function defaultSavePath(outputDir, title, ext) {
  const dir = outputDir && fs.existsSync(outputDir) ? outputDir : process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const base = sanitizeFilename(title || 'Transcription_Siabanni');
  return path.join(dir, `${base}_${stamp}.${ext}`);
}

function formatTimestamp(seconds) {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ====== Export DOCX ======
async function exportDocx(payload) {
  const savePath = defaultSavePath(payload.outputDirectory, payload.title, 'docx');
  const dateStr = new Date(payload.date || Date.now()).toLocaleString('fr-FR');

  const children = [];

  // Titre
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: payload.title || 'Transcription', bold: true })],
  }));

  // Metadata
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: `Généré le ${dateStr}`, italics: true, color: '666666' })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({
      text: 'Siabanni Transcribe — Consortium SFR',
      italics: true, size: 18, color: '888888',
    })],
  }));

  // Ligne de separation
  children.push(new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 },
    },
    spacing: { after: 300 },
    children: [new TextRun('')],
  }));

  // Resume s'il existe
  if (payload.summary) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Résumé automatique (IA)', bold: true })],
    }));
    for (const line of payload.summary.split(/\n/)) {
      if (line.trim().startsWith('##')) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: line.replace(/^##+\s*/, ''), bold: true })],
        }));
      } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun(line.replace(/^[-*]\s*/, ''))],
        }));
      } else if (line.trim()) {
        children.push(new Paragraph({ children: [new TextRun(line)] }));
      }
    }
    children.push(new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun('')] }));
  }

  // Transcription
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: 'Transcription', bold: true })],
  }));

  const segments = payload.segments && payload.segments.length > 0 ? payload.segments : null;

  if (segments) {
    for (const seg of segments) {
      const runs = [];
      if (payload.includeTimestamps && (seg.time || seg.time === 0)) {
        runs.push(new TextRun({
          text: `[${formatTimestamp(seg.time)}] `,
          color: '6B7280', bold: false,
        }));
      }
      if (seg.speaker) {
        runs.push(new TextRun({ text: `${seg.speaker} : `, bold: true, color: '8B5CF6' }));
      }
      runs.push(new TextRun(seg.text.trim()));
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: runs,
      }));
    }
  } else {
    // Pas de segments : on split par lignes
    for (const line of (payload.text || '').split(/\n/)) {
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun(line)],
      }));
    }
  }

  const doc = new Document({
    creator: 'Siabanni Transcribe - Consortium SFR',
    title: payload.title || 'Transcription',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, color: '1E40AF', font: 'Calibri' },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, color: '2563EB', font: 'Calibri' },
          paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, color: '3B82F6', font: 'Calibri' },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: 'Siabanni Transcribe — Consortium SFR',
              italics: true, size: 18, color: '999999',
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Page ', size: 18, color: '999999' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '999999' }),
              new TextRun({ text: ' / ', size: 18, color: '999999' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '999999' }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(savePath, buffer);
  return savePath;
}

// ====== Export PDF ======
async function exportPdf(payload) {
  const savePath = defaultSavePath(payload.outputDirectory, payload.title, 'pdf');
  const dateStr = new Date(payload.date || Date.now()).toLocaleString('fr-FR');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
          Title: payload.title || 'Transcription',
          Author: 'Siabanni Transcribe - Consortium SFR',
          CreationDate: new Date(),
        },
      });
      const stream = fs.createWriteStream(savePath);
      doc.pipe(stream);

      // Titre
      doc.fillColor('#1E40AF').fontSize(22).font('Helvetica-Bold')
        .text(payload.title || 'Transcription', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor('#666').fontSize(10).font('Helvetica-Oblique')
        .text(`Généré le ${dateStr}`, { align: 'center' });
      doc.moveDown(0.2);
      doc.fillColor('#888').fontSize(9)
        .text('Siabanni Transcribe — Consortium SFR', { align: 'center' });

      // Ligne separatrice
      doc.moveDown(0.8);
      doc.strokeColor('#2E75B6').lineWidth(1).moveTo(60, doc.y).lineTo(535, doc.y).stroke();
      doc.moveDown(1);

      // Resume
      if (payload.summary) {
        doc.fillColor('#2563EB').fontSize(16).font('Helvetica-Bold')
          .text('Résumé automatique (IA)');
        doc.moveDown(0.5);
        doc.fillColor('#222').fontSize(11).font('Helvetica');
        for (const line of payload.summary.split(/\n/)) {
          if (line.trim().startsWith('##')) {
            doc.moveDown(0.4);
            doc.fillColor('#3B82F6').fontSize(13).font('Helvetica-Bold')
              .text(line.replace(/^##+\s*/, ''));
            doc.moveDown(0.2);
            doc.fillColor('#222').fontSize(11).font('Helvetica');
          } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
            doc.text('•  ' + line.replace(/^[-*]\s*/, ''), { indent: 10 });
          } else if (line.trim()) {
            doc.text(line);
          }
        }
        doc.moveDown(1);
      }

      // Transcription
      doc.fillColor('#2563EB').fontSize(16).font('Helvetica-Bold').text('Transcription');
      doc.moveDown(0.5);

      const segments = payload.segments && payload.segments.length > 0 ? payload.segments : null;
      if (segments) {
        for (const seg of segments) {
          if (payload.includeTimestamps && (seg.time || seg.time === 0)) {
            doc.fillColor('#6B7280').fontSize(9).font('Helvetica')
              .text(`[${formatTimestamp(seg.time)}]`, { continued: true })
              .text('  ', { continued: true });
          }
          if (seg.speaker) {
            doc.fillColor('#8B5CF6').fontSize(11).font('Helvetica-Bold')
              .text(`${seg.speaker} : `, { continued: true });
          }
          doc.fillColor('#222').fontSize(11).font('Helvetica').text(seg.text.trim());
          doc.moveDown(0.3);
        }
      } else {
        doc.fillColor('#222').fontSize(11).font('Helvetica')
          .text(payload.text || '', { align: 'left' });
      }

      // Pied de page (numero de page)
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.fillColor('#999').fontSize(8).font('Helvetica')
          .text(`Page ${i + 1} / ${range.count}`, 60, doc.page.height - 40, { align: 'center' });
      }

      doc.end();
      stream.on('finish', () => resolve(savePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ====== Export TXT ======
async function exportTxt(payload) {
  const savePath = defaultSavePath(payload.outputDirectory, payload.title, 'txt');
  const dateStr = new Date(payload.date || Date.now()).toLocaleString('fr-FR');

  let content = '';
  content += '='.repeat(70) + '\n';
  content += (payload.title || 'Transcription') + '\n';
  content += '='.repeat(70) + '\n';
  content += `Genere le ${dateStr}\n`;
  content += 'Siabanni Transcribe - Consortium SFR\n';
  content += '='.repeat(70) + '\n\n';

  if (payload.summary) {
    content += 'RESUME AUTOMATIQUE (IA)\n';
    content += '-'.repeat(70) + '\n';
    content += payload.summary + '\n\n';
    content += '-'.repeat(70) + '\n\n';
  }

  content += 'TRANSCRIPTION\n';
  content += '-'.repeat(70) + '\n\n';

  const segments = payload.segments && payload.segments.length > 0 ? payload.segments : null;
  if (segments) {
    for (const seg of segments) {
      let line = '';
      if (payload.includeTimestamps && (seg.time || seg.time === 0)) {
        line += `[${formatTimestamp(seg.time)}] `;
      }
      if (seg.speaker) line += `${seg.speaker} : `;
      line += seg.text.trim();
      content += line + '\n';
    }
  } else {
    content += payload.text || '';
  }

  fs.writeFileSync(savePath, content, 'utf-8');
  return savePath;
}

module.exports = { exportDocx, exportPdf, exportTxt };
