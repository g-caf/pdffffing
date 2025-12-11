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
    console.log('Detected text fields:', textFields.length);
    fields.push(...textFields);

    // DISABLED: Checkbox detection causes too many false positives
    // const checkboxes = this.detectCheckboxes(imageData, canvas.width, canvas.height, pageHeight, scale);
    // console.log('Detected checkboxes:', checkboxes.length);
    // fields.push(...checkboxes);

    return fields;
  }

  /**
   * Detect horizontal lines that might be text input fields
   */
  static detectTextInputLines(imageData, width, height, pageHeight, scale) {
    const fields = [];
    const data = imageData.data;

    // Scan horizontal lines - check every other row for performance
    for (let y = 0; y < height; y += 1) {
      let lineStart = null;
      let consecutiveBlack = 0;
      let totalPixels = 0;
      let blackPixels = 0;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if pixel is dark (part of a line)
        const isBlack = r < 120 && g < 120 && b < 120;

        if (lineStart === null && isBlack) {
          lineStart = x;
          consecutiveBlack = 1;
          totalPixels = 1;
          blackPixels = 1;
        } else if (lineStart !== null) {
          totalPixels++;
          if (isBlack) {
            blackPixels++;
            consecutiveBlack++;
          } else {
            // Allow small gaps in the line
            if (consecutiveBlack > 0 && totalPixels - blackPixels < 5) {
              totalPixels++;
            } else if (totalPixels > 0 && blackPixels / totalPixels > 0.7 && totalPixels > 40) {
              // End of line - found a potential text field
              const lineWidth = x - lineStart;

              // Convert canvas coordinates to PDF coordinates
              const pdfX = lineStart / scale;
              const pdfY = pageHeight - (y / scale);
              const pdfWidth = lineWidth / scale;
              const pdfHeight = 18; // Default height

              // Only add if it looks like an input field (reasonable width)
              if (pdfWidth > 30 && pdfWidth < 400) {
                fields.push({
                  type: 'text',
                  rect: [pdfX, pdfY - pdfHeight, pdfX + pdfWidth, pdfY],
                  confidence: 'medium',
                  detectionMethod: 'horizontal-line',
                  y: y
                });
              }

              // Reset
              lineStart = null;
              consecutiveBlack = 0;
              totalPixels = 0;
              blackPixels = 0;
            } else {
              // Not a continuous line, reset
              lineStart = null;
              consecutiveBlack = 0;
              totalPixels = 0;
              blackPixels = 0;
            }
          }
        }
      }

      // Check end of row
      if (lineStart !== null && totalPixels > 40 && blackPixels / totalPixels > 0.7) {
        const lineWidth = width - lineStart;
        const pdfX = lineStart / scale;
        const pdfY = pageHeight - (y / scale);
        const pdfWidth = lineWidth / scale;
        const pdfHeight = 18;

        if (pdfWidth > 30 && pdfWidth < 400) {
          fields.push({
            type: 'text',
            rect: [pdfX, pdfY - pdfHeight, pdfX + pdfWidth, pdfY],
            confidence: 'medium',
            detectionMethod: 'horizontal-line',
            y: y
          });
        }
      }
    }

    console.log(`Raw text fields before merge: ${fields.length}`);

    // Merge nearby fields (they might be parts of the same field)
    const merged = this.mergeNearbyFields(fields, 3);
    console.log(`Text fields after merge: ${merged.length}`);

    return merged;
  }

  /**
   * Detect empty circles/squares that might be checkboxes
   * Using very strict criteria to minimize false positives
   */
  static detectCheckboxes(imageData, width, height, pageHeight, scale) {
    const fields = [];
    const data = imageData.data;
    const targetSizes = [10, 12, 14, 16, 18]; // Common checkbox sizes in pixels
    const checked = new Set(); // Avoid duplicates

    // Only check specific sizes, not a range
    for (const size of targetSizes) {
      for (let y = size; y < height - size; y += Math.floor(size / 2)) {
        for (let x = size; x < width - size; x += Math.floor(size / 2)) {
          const key = `${Math.floor(x / 5)}-${Math.floor(y / 5)}`;
          if (checked.has(key)) continue;

          // Very strict checkbox pattern check
          const score = this.checkboxScore(data, x, y, width, height, size);

          // Require high confidence (score > 0.8) to avoid false positives
          if (score > 0.8) {
            const pdfX = x / scale;
            const pdfY = pageHeight - (y / scale);
            const pdfSize = size / scale;

            fields.push({
              type: 'checkbox',
              rect: [pdfX, pdfY - pdfSize, pdfX + pdfSize, pdfY],
              confidence: score > 0.9 ? 'high' : 'medium',
              detectionMethod: 'pattern-match',
              score
            });

            checked.add(key);
          }
        }
      }
    }

    // Remove overlapping checkboxes (keep highest score)
    return this.removeOverlappingCheckboxes(fields);
  }

  /**
   * Score how likely a region is to be a checkbox (0-1)
   * Returns confidence score based on multiple criteria
   */
  static checkboxScore(data, x, y, width, height, size) {
    let score = 0;
    const checks = 5; // Number of checks we perform

    // Helper to check if pixel is dark
    const isDark = (px, py) => {
      if (py < 0 || py >= height || px < 0 || px >= width) return false;
      const idx = (Math.floor(py) * width + Math.floor(px)) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      return r < 100 && g < 100 && b < 100;
    };

    // Helper to check if pixel is light
    const isLight = (px, py) => {
      if (py < 0 || py >= height || px < 0 || px >= width) return false;
      const idx = (Math.floor(py) * width + Math.floor(px)) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      return r > 220 && g > 220 && b > 220;
    };

    // 1. Check that edges are dark
    const edgeSamples = [
      [x, y], [x + size, y], [x, y + size], [x + size, y + size], // Corners
      [x + size/2, y], [x + size/2, y + size], // Top/bottom
      [x, y + size/2], [x + size, y + size/2] // Left/right
    ];
    const darkEdges = edgeSamples.filter(([px, py]) => isDark(px, py)).length;
    if (darkEdges >= 6) score += 1/checks;

    // 2. Check that center is light (empty)
    const centerSamples = [
      [x + size/2, y + size/2],
      [x + size/3, y + size/3],
      [x + 2*size/3, y + 2*size/3]
    ];
    const lightCenter = centerSamples.filter(([px, py]) => isLight(px, py)).length;
    if (lightCenter >= 2) score += 1/checks;

    // 3. Check aspect ratio is square-ish
    score += 1/checks; // We already filter by size

    // 4. Check it's not part of a line (isolated)
    const isolation = this.checkIsolation(data, x, y, width, height, size);
    if (isolation > 0.7) score += 1/checks;

    // 5. Check perimeter is consistent (closed shape)
    const perimeterCheck = this.checkPerimeter(data, x, y, width, height, size);
    if (perimeterCheck > 0.7) score += 1/checks;

    return score;
  }

  /**
   * Check if checkbox is isolated (not part of a larger shape)
   */
  static checkIsolation(data, x, y, width, height, size) {
    // Sample just outside the checkbox bounds
    const buffer = 3;
    const outerSamples = [
      [x - buffer, y - buffer],
      [x + size + buffer, y - buffer],
      [x - buffer, y + size + buffer],
      [x + size + buffer, y + size + buffer]
    ];

    let lightCount = 0;
    for (const [px, py] of outerSamples) {
      if (py < 0 || py >= height || px < 0 || px >= width) continue;
      const idx = (Math.floor(py) * width + Math.floor(px)) * 4;
      const r = data[idx];
      if (r > 200) lightCount++;
    }

    return lightCount / outerSamples.length;
  }

  /**
   * Check if perimeter forms a closed shape
   */
  static checkPerimeter(data, x, y, width, height, size) {
    const step = Math.max(1, Math.floor(size / 8));
    let darkCount = 0;
    let total = 0;

    // Sample around perimeter
    for (let i = 0; i < size; i += step) {
      const samples = [
        [x + i, y], // Top
        [x + i, y + size], // Bottom
        [x, y + i], // Left
        [x + size, y + i] // Right
      ];

      for (const [px, py] of samples) {
        if (py < 0 || py >= height || px < 0 || px >= width) continue;
        total++;
        const idx = (Math.floor(py) * width + Math.floor(px)) * 4;
        const r = data[idx];
        if (r < 100) darkCount++;
      }
    }

    return total > 0 ? darkCount / total : 0;
  }

  /**
   * Remove overlapping checkboxes, keeping the one with highest score
   */
  static removeOverlappingCheckboxes(fields) {
    const result = [];
    const sorted = fields.sort((a, b) => (b.score || 0) - (a.score || 0));

    for (const field of sorted) {
      let overlaps = false;

      for (const existing of result) {
        // Check if rectangles overlap
        const overlap = !(
          field.rect[2] < existing.rect[0] ||
          field.rect[0] > existing.rect[2] ||
          field.rect[3] < existing.rect[1] ||
          field.rect[1] > existing.rect[3]
        );

        if (overlap) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        result.push(field);
      }
    }

    return result;
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
