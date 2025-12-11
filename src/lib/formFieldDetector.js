export function transformRect(rect, pageHeight, scale) {
  const [x1, y1, x2, y2] = rect;
  const x = x1 * scale;
  const y = (pageHeight - y2) * scale;
  const width = (x2 - x1) * scale;
  const height = (y2 - y1) * scale;
  return { x, y, width, height };
}

function mapFieldType(annotation) {
  const fieldType = annotation.fieldType;
  
  if (fieldType === 'Tx') return 'text';
  if (fieldType === 'Btn') {
    if (annotation.checkBox) return 'checkbox';
    if (annotation.radioButton) return 'radio';
    return 'checkbox';
  }
  if (fieldType === 'Ch') return 'dropdown';
  if (fieldType === 'Sig') return 'signature';
  
  return 'text';
}

export async function detectFormFields(pdfJsPage) {
  const annotations = await pdfJsPage.getAnnotations();
  
  const formFields = annotations
    .filter(annotation => annotation.subtype === 'Widget' || annotation.fieldType)
    .map((annotation, index) => {
      const field = {
        id: annotation.id || `field-${index}`,
        name: annotation.fieldName || '',
        type: mapFieldType(annotation),
        rect: annotation.rect || [0, 0, 0, 0],
        value: annotation.fieldValue ?? annotation.buttonValue ?? '',
        options: annotation.options || [],
        required: annotation.required || false,
        readOnly: annotation.readOnly || false
      };
      
      return field;
    });
  
  return formFields;
}
