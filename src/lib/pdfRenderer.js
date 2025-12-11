import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export class PDFRenderer {
  constructor() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.pageCount = 0;
    this.scale = 1.5;
  }

  async loadPDF(arrayBuffer) {
    // Make a copy of the ArrayBuffer to avoid PDF.js detaching/consuming the original
    const copy = arrayBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: copy });
    this.pdfDoc = await loadingTask.promise;
    this.pageCount = this.pdfDoc.numPages;
    return this.pageCount;
  }

  async renderPage(pageNum, canvas) {
    if (!this.pdfDoc) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
  }

  async getAllPages() {
    if (!this.pdfDoc) return [];

    const pages = [];
    for (let i = 1; i <= this.pageCount; i++) {
      pages.push(i);
    }
    return pages;
  }
}
