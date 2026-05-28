import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

  async getPage(pageNum) {
    if (!this.pdfDoc) return null;
    return await this.pdfDoc.getPage(pageNum);
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

  async getTextItems(pageNum) {
    if (!this.pdfDoc) return [];

    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });
    const textContent = await page.getTextContent();

    return textContent.items
      .filter((item) => item.str && item.str.trim().length > 0)
      .map((item, index) => {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.hypot(transform[2], transform[3]);
        const width = item.width * viewport.scale;
        const angle = Math.atan2(transform[1], transform[0]);

        return {
          id: `${pageNum}-${index}`,
          text: item.str,
          left: transform[4],
          top: transform[5] - fontHeight,
          width,
          height: fontHeight,
          fontSize: fontHeight,
          angle
        };
      });
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
