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

  async getFormFields() {
    if (!this.pdfDoc) throw new Error('No PDF loaded');
    
    try {
      const form = this.pdfDoc.getForm();
      const fields = form.getFields();
      
      return fields.map(field => {
        const name = field.getName();
        const type = field.constructor.name.replace('PDF', '').replace('Field', '');
        let value = null;
        
        try {
          if (type === 'Text') {
            value = field.getText();
          } else if (type === 'CheckBox') {
            value = field.isChecked();
          } else if (type === 'Dropdown') {
            value = field.getSelected();
          } else if (type === 'RadioGroup') {
            value = field.getSelected();
          } else if (type === 'OptionList') {
            value = field.getSelected();
          }
        } catch (e) {
          value = null;
        }
        
        return { name, type, value };
      });
    } catch (error) {
      console.error('Error getting form fields:', error);
      return [];
    }
  }

  async fillFormFields(fieldValues) {
    if (!this.pdfDoc) throw new Error('No PDF loaded');
    
    const form = this.pdfDoc.getForm();
    const results = { success: [], failed: [] };
    
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      try {
        const field = form.getField(fieldName);
        const type = field.constructor.name;
        
        if (type === 'PDFTextField') {
          form.getTextField(fieldName).setText(String(value));
        } else if (type === 'PDFCheckBox') {
          if (value) {
            form.getCheckBox(fieldName).check();
          } else {
            form.getCheckBox(fieldName).uncheck();
          }
        } else if (type === 'PDFDropdown') {
          form.getDropdown(fieldName).select(String(value));
        } else if (type === 'PDFRadioGroup') {
          form.getRadioGroup(fieldName).select(String(value));
        } else if (type === 'PDFOptionList') {
          form.getOptionList(fieldName).select(String(value));
        } else {
          results.failed.push({ fieldName, error: `Unsupported field type: ${type}` });
          continue;
        }
        
        results.success.push(fieldName);
      } catch (error) {
        results.failed.push({ fieldName, error: error.message });
      }
    }
    
    return results;
  }

  async flattenForm() {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    try {
      const form = this.pdfDoc.getForm();
      form.flatten();
      return true;
    } catch (error) {
      console.error('Error flattening form:', error);
      return false;
    }
  }

  async addFormFields(pageIndex, fields) {
    if (!this.pdfDoc) throw new Error('No PDF loaded');

    try {
      const form = this.pdfDoc.getForm();
      const pages = this.pdfDoc.getPages();
      const page = pages[pageIndex];

      if (!page) throw new Error(`Page ${pageIndex} not found`);

      const results = { success: [], failed: [] };

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];

        try {
          const fieldName = field.name || `field_${pageIndex}_${i}_${Date.now()}`;

          if (field.type === 'text') {
            const textField = form.createTextField(fieldName);
            textField.addToPage(page, {
              x: field.rect[0],
              y: field.rect[1],
              width: field.rect[2] - field.rect[0],
              height: field.rect[3] - field.rect[1]
            });
            textField.setText('');
            textField.enableMultiline();
            results.success.push(fieldName);
          } else if (field.type === 'checkbox') {
            const checkbox = form.createCheckBox(fieldName);
            checkbox.addToPage(page, {
              x: field.rect[0],
              y: field.rect[1],
              width: field.rect[2] - field.rect[0],
              height: field.rect[3] - field.rect[1]
            });
            results.success.push(fieldName);
          } else if (field.type === 'radio') {
            // Radio buttons need a group name
            const groupName = field.groupName || `radio_group_${pageIndex}_${i}`;
            const radioGroup = form.getOrCreateRadioGroup(groupName);
            radioGroup.addOptionToPage(fieldName, page, {
              x: field.rect[0],
              y: field.rect[1],
              width: field.rect[2] - field.rect[0],
              height: field.rect[3] - field.rect[1]
            });
            results.success.push(fieldName);
          }
        } catch (error) {
          results.failed.push({ field, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error adding form fields:', error);
      throw error;
    }
  }
}
