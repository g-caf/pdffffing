/**
 * Detects potential form fields in a PDF by analyzing visual patterns
 * Looks for:
 * - Horizontal lines (text input fields)
 * - Empty circles/squares (checkboxes/radio buttons)
 * - Underscores (fill-in-the-blank fields)
 */

export class VisualFormDetector {
  /**
   * Analyze a canvas to find potential form field locations
   * @param {HTMLCanvasElement} canvas - The rendered PDF page
   * @param {number} pageHeight - PDF page height in points
   * @param {number} scale - Rendering scale
   * @returns {Array} Array of detected form field candidates
   */
  static detectFormFields(canvas, pageHeight, scale) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const fields = [];

    // Detect horizontal lines (potential text fields)
    const textFields = this.detectTextInputLines(imageData, canvas.width, canvas.height, pageHeight, scale);
    fields.push(...textFields);

    // Detect checkboxes and radio buttons
    const checkboxes = this.detectCheckboxes(imageData, canvas.width, canvas.height, pageHeight, scale);
    fields.push(...checkboxes);

    return fields;
  }

  /**
   * Detect horizontal lines that might be text input fields
   */
  static detectTextInputLines(imageData, width, height, pageHeight, scale) {
    const fields = [];
    const data = imageData.data;

    // Scan horizontal lines
    for (let y = 0; y < height; y += 2) {
      let lineStart = null;
      let consecutiveBlack = 0;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if pixel is dark (part of a line)
        const isBlack = r < 100 && g < 100 && b < 100;

        if (isBlack) {
          if (lineStart === null) {
            lineStart = x;
          }
          consecutiveBlack++;
        } else {
          // End of potential line
          if (lineStart !== null && consecutiveBlack > 50) {
            // Found a horizontal line - potential text field
            const lineWidth = x - lineStart;

            // Convert canvas coordinates to PDF coordinates
            const pdfX = lineStart / scale;
            const pdfY = pageHeight - (y / scale);
            const pdfWidth = lineWidth / scale;
            const pdfHeight = 20; // Default height

            fields.push({
              type: 'text',
              rect: [pdfX, pdfY - pdfHeight, pdfX + pdfWidth, pdfY],
              confidence: 'medium',
              detectionMethod: 'horizontal-line'
            });
          }
          lineStart = null;
          consecutiveBlack = 0;
        }
      }
    }

    // Merge nearby fields (they might be parts of the same field)
    return this.mergeNearbyFields(fields);
  }

  /**
   * Detect empty circles/squares that might be checkboxes
   */
  static detectCheckboxes(imageData, width, height, pageHeight, scale) {
    const fields = [];
    const data = imageData.data;
    const minSize = 10;
    const maxSize = 30;

    // Simple checkbox detection: look for small square/circle outlines
    for (let y = minSize; y < height - maxSize; y += 5) {
      for (let x = minSize; x < width - maxSize; x += 5) {
        // Check if this area has a box/circle outline
        if (this.isCheckboxPattern(data, x, y, width, height, 15)) {
          const pdfX = x / scale;
          const pdfY = pageHeight - (y / scale);
          const size = 15 / scale;

          fields.push({
            type: 'checkbox',
            rect: [pdfX, pdfY - size, pdfX + size, pdfY],
            confidence: 'low',
            detectionMethod: 'pattern-match'
          });
        }
      }
    }

    return fields;
  }

  /**
   * Check if a region matches a checkbox pattern
   */
  static isCheckboxPattern(data, x, y, width, height, size) {
    // Check corners and edges for dark pixels, center for light pixels
    const cornerDark = [];
    const centerLight = [];

    // Sample corners
    const corners = [
      [x, y], [x + size, y], [x, y + size], [x + size, y + size]
    ];

    for (const [cx, cy] of corners) {
      if (cy >= 0 && cy < height && cx >= 0 && cx < width) {
        const idx = (cy * width + cx) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        cornerDark.push(r < 150 && g < 150 && b < 150);
      }
    }

    // Sample center
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    if (centerY >= 0 && centerY < height && centerX >= 0 && centerX < width) {
      const idx = (Math.floor(centerY) * width + Math.floor(centerX)) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      centerLight.push(r > 200 && g > 200 && b > 200);
    }

    // Checkbox has dark edges and light center
    return cornerDark.filter(Boolean).length >= 3 && centerLight[0];
  }

  /**
   * Merge fields that are very close together (likely the same field)
   */
  static mergeNearbyFields(fields, threshold = 5) {
    if (fields.length === 0) return fields;

    const merged = [];
    const used = new Set();

    for (let i = 0; i < fields.length; i++) {
      if (used.has(i)) continue;

      let field = { ...fields[i] };
      used.add(i);

      // Look for nearby fields to merge
      for (let j = i + 1; j < fields.length; j++) {
        if (used.has(j)) continue;

        const other = fields[j];
        const yDiff = Math.abs(field.rect[1] - other.rect[1]);

        // If fields are on approximately the same line
        if (yDiff < threshold) {
          // Merge them
          field.rect[0] = Math.min(field.rect[0], other.rect[0]);
          field.rect[2] = Math.max(field.rect[2], other.rect[2]);
          used.add(j);
        }
      }

      merged.push(field);
    }

    return merged;
  }

  /**
   * Filter out likely false positives
   */
  static filterFields(fields) {
    return fields.filter(field => {
      const width = field.rect[2] - field.rect[0];
      const height = field.rect[3] - field.rect[1];

      // Filter out too small or too large fields
      if (field.type === 'text') {
        return width > 30 && width < 500 && height > 5 && height < 50;
      }

      if (field.type === 'checkbox') {
        return width > 5 && width < 40 && height > 5 && height < 40;
      }

      return true;
    });
  }
}
