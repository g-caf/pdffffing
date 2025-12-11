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
  const annotations = await pdfJsPage.getAnnotations({ intent: 'display' });
  
  console.log('All annotations found:', annotations.length);
  console.log('Annotations:', annotations.map(a => ({ 
    subtype: a.subtype, 
    fieldType: a.fieldType, 
    fieldName: a.fieldName,
    annotationType: a.annotationType
  })));
  
  const formFields = annotations
    .filter(annotation => {
      // Widget is the annotation type for form fields
      // Also check for specific field types
      const isWidget = annotation.subtype === 'Widget';
      const hasFieldType = !!annotation.fieldType;
      const isFormAnnotation = annotation.annotationType === 20; // AnnotationType.WIDGET
      return isWidget || hasFieldType || isFormAnnotation;
    })
    .map((annotation, index) => {
      console.log('Processing field:', annotation);
      
      const field = {
        id: annotation.id || `field-${index}-${Date.now()}`,
        name: annotation.fieldName || annotation.alternativeText || '',
        type: mapFieldType(annotation),
        rect: annotation.rect || [0, 0, 0, 0],
        value: annotation.fieldValue ?? annotation.buttonValue ?? '',
        options: annotation.options?.map(o => o.displayValue || o) || [],
        required: annotation.required || false,
        readOnly: annotation.readOnly || false
      };
      
      return field;
    });
  
  console.log('Form fields detected:', formFields.length, formFields);
  
  return formFields;
}
