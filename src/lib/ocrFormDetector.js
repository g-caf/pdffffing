import { createWorker } from 'tesseract.js';

/**
 * OCR-based form field detector
 * Finds text labels like "NAME:", "ADDRESS:", etc. and places fields after them
 */
export class OCRFormDetector {
  constructor() {
    this.worker = null;
  }

  async initialize() {
    if (!this.worker) {
      console.log('Initializing Tesseract worker...');
      this.worker = await createWorker('eng', 1, {
        logger: (m) => console.log('Tesseract:', m),
      });
      console.log('Tesseract worker initialized successfully');
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Detect form fields using OCR
   */
  async detectFormFields(canvas, pageHeight, scale) {
    await this.initialize();

    try {
      console.log('Running OCR on page...');
      const { data } = await this.worker.recognize(canvas);

      console.log('OCR completed, analyzing text...');
      const fields = this.analyzeOCRResults(data, pageHeight, scale);

      return fields;
    } catch (error) {
      console.error('OCR error:', error);
      return [];
    }
  }

  /**
   * Analyze OCR results to find form field labels
   */
  analyzeOCRResults(ocrData, pageHeight, scale) {
    const fields = [];
    const { words, lines } = ocrData;

    console.log(`Found ${words.length} words, ${lines.length} lines`);

    // Common form field label patterns
    const labelPatterns = [
      /^(NAME|FIRST\s*NAME|LAST\s*NAME|FULL\s*NAME)[\s:]*$/i,
      /^(ADDRESS|STREET|ADDR)[\s:]*$/i,
      /^(CITY)[\s:]*$/i,
      /^(STATE|ST)[\s:]*$/i,
      /^(ZIP|ZIP\s*CODE|POSTAL\s*CODE)[\s:]*$/i,
      /^(PHONE|TELEPHONE|TEL|PHONE\s*NUMBER)[\s:]*$/i,
      /^(EMAIL|E-MAIL)[\s:]*$/i,
      /^(DATE|DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE)[\s:]*$/i,
      /^(SIGNATURE|SIGN)[\s:]*$/i,
      /^(RELATIONSHIP)[\s:]*$/i,
      /^(EMERGENCY\s*CONTACT)[\s:]*$/i,
      /^(BOROUGH)[\s:]*$/i,
      /^(CENTER|REC\s*CENTER)[\s:]*$/i,
    ];

    // Process each word
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const text = word.text.trim();

      // Check if this word matches a label pattern
      let isLabel = false;
      for (const pattern of labelPatterns) {
        if (pattern.test(text)) {
          isLabel = true;
          break;
        }
      }

      // Also check multi-word labels
      if (!isLabel && i < words.length - 2) {
        const twoWords = `${text} ${words[i + 1].text}`.trim();
        const threeWords = i < words.length - 2
          ? `${text} ${words[i + 1].text} ${words[i + 2].text}`.trim()
          : '';

        for (const pattern of labelPatterns) {
          if (pattern.test(twoWords) || pattern.test(threeWords)) {
            isLabel = true;
            break;
          }
        }
      }

      if (isLabel) {
        // Found a label! Create a field to the right of it
        const bbox = word.bbox;

        // Convert OCR coordinates to PDF coordinates
        // OCR gives us: {x0, y0, x1, y1} in canvas pixels
        const fieldX = (bbox.x1 + 10) / scale; // Start field 10px after label
        const fieldY = pageHeight - (bbox.y1 / scale);
        const fieldWidth = 200; // Default width
        const fieldHeight = 18;

        fields.push({
          type: 'text',
          rect: [fieldX, fieldY - fieldHeight, fieldX + fieldWidth, fieldY],
          confidence: 'high',
          detectionMethod: 'ocr-label',
          label: text,
          id: `ocr-${i}-${Date.now()}`
        });

        console.log(`Found label: "${text}" at (${fieldX}, ${fieldY})`);
      }
    }

    // Also detect underscores/blank lines (common in forms)
    const underscoreFields = this.detectUnderscoreFields(lines, pageHeight, scale);
    fields.push(...underscoreFields);

    console.log(`Detected ${fields.length} total fields via OCR`);
    return fields;
  }

  /**
   * Detect fields marked by underscores or blank lines
   */
  detectUnderscoreFields(lines, pageHeight, scale) {
    const fields = [];

    for (const line of lines) {
      const text = line.text;

      // Look for patterns like "___________" or "____________"
      const underscoreMatch = text.match(/_{5,}/g);

      if (underscoreMatch) {
        // Found underscore pattern
        const bbox = line.bbox;

        const fieldX = bbox.x0 / scale;
        const fieldY = pageHeight - (bbox.y1 / scale);
        const fieldWidth = (bbox.x1 - bbox.x0) / scale;
        const fieldHeight = 18;

        fields.push({
          type: 'text',
          rect: [fieldX, fieldY - fieldHeight, fieldX + fieldWidth, fieldY],
          confidence: 'medium',
          detectionMethod: 'ocr-underscore',
          id: `underscore-${Date.now()}-${Math.random()}`
        });
      }
    }

    return fields;
  }

  /**
   * Filter out overlapping or duplicate fields
   */
  static filterFields(fields) {
    const filtered = [];

    for (const field of fields) {
      let isDuplicate = false;

      for (const existing of filtered) {
        // Check if fields overlap significantly
        const overlapX = !(field.rect[2] < existing.rect[0] || field.rect[0] > existing.rect[2]);
        const overlapY = !(field.rect[3] < existing.rect[1] || field.rect[1] > existing.rect[3]);

        if (overlapX && overlapY) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        const width = field.rect[2] - field.rect[0];
        const height = field.rect[3] - field.rect[1];

        // Only include reasonable-sized fields
        if (width > 20 && width < 500 && height > 5 && height < 50) {
          filtered.push(field);
        }
      }
    }

    return filtered;
  }
}
