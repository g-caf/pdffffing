import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export class PDFProcessor {
  constructor() {
    this.pdfDoc = null;
    this.originalBytes = null;
  }

  async loadPDF(arrayBuffer) {
    this.originalBytes = arrayBuffer;
    this.pdfDoc = await PDFDocument.load(arrayBuffer);
    return this.pdfDoc;
  }

  async createNewPDF() {
    this.pdfDoc = await PDFDocument.create();
    return this.pdfDoc;
  }

  async mergePDFs(pdfArrayBuffers) {
    const mergedPdf = await PDFDocument.create();

    for (const pdfBytes of pdfArrayBuffers) {
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    this.pdfDoc = mergedPdf;
    return mergedPdf;
  }

  async addText(pageIndex, text, x, y, options = {}) {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    const pages = this.pdfDoc.getPages();
    const page = pages[pageIndex];

    // Map font family name to StandardFonts
    const fontName = options.fontFamily || 'Helvetica';
    let fontKey = StandardFonts.Helvetica;

    if (fontName.includes('Courier')) {
      if (fontName.includes('BoldOblique')) fontKey = StandardFonts.CourierBoldOblique;
      else if (fontName.includes('Bold')) fontKey = StandardFonts.CourierBold;
      else if (fontName.includes('Oblique')) fontKey = StandardFonts.CourierOblique;
      else fontKey = StandardFonts.Courier;
    } else if (fontName.includes('Times')) {
      if (fontName.includes('BoldOblique')) fontKey = StandardFonts.TimesRomanBoldItalic;
      else if (fontName.includes('Bold')) fontKey = StandardFonts.TimesRomanBold;
      else if (fontName.includes('Oblique')) fontKey = StandardFonts.TimesRomanItalic;
      else fontKey = StandardFonts.TimesRoman;
    } else {
      if (fontName.includes('BoldOblique')) fontKey = StandardFonts.HelveticaBoldOblique;
      else if (fontName.includes('Bold')) fontKey = StandardFonts.HelveticaBold;
      else if (fontName.includes('Oblique')) fontKey = StandardFonts.HelveticaOblique;
      else fontKey = StandardFonts.Helvetica;
    }

    const font = await this.pdfDoc.embedFont(fontKey);
    const fontSize = options.fontSize || 12;
    const color = options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0, 0, 0);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color
    });
  }

  async removePage(pageIndex) {
    if (!this.pdfDoc) throw new Error('No PDF loaded');
    this.pdfDoc.removePage(pageIndex);
  }

  async reorderPages(newOrder) {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    // Create a new PDF with pages in the new order
    const reorderedPdf = await PDFDocument.create();
    const pages = this.pdfDoc.getPages();

    for (const pageIndex of newOrder) {
      const [copiedPage] = await reorderedPdf.copyPages(this.pdfDoc, [pageIndex]);
      reorderedPdf.addPage(copiedPage);
    }

    this.pdfDoc = reorderedPdf;
    return reorderedPdf;
  }

  async extractText(pageIndex) {
    // Note: pdf-lib doesn't support text extraction
    // This would require PDF.js or another library
    // For now, we'll return a placeholder
    return 'Text extraction requires additional implementation';
  }

  async saveToBytes() {
    if (!this.pdfDoc) throw new Error('No PDF loaded');
    const pdfBytes = await this.pdfDoc.save();
    return pdfBytes;
  }

  getPageCount() {
    return this.pdfDoc ? this.pdfDoc.getPageCount() : 0;
  }
}
