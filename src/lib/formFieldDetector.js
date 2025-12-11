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
  // Try multiple methods to find form fields
  
  // Method 1: getAnnotations with different intents
  let annotations = await pdfJsPage.getAnnotations({ intent: 'display' });
  console.log('Annotations (display intent):', annotations.length);
  
  if (annotations.length === 0) {
    annotations = await pdfJsPage.getAnnotations({ intent: 'print' });
    console.log('Annotations (print intent):', annotations.length);
  }
  
  if (annotations.length === 0) {
    annotations = await pdfJsPage.getAnnotations();
    console.log('Annotations (no intent):', annotations.length);
  }
  
  // Log all annotation details for debugging
  if (annotations.length > 0) {
    console.log('Annotation details:', annotations.map(a => ({
      subtype: a.subtype,
      fieldType: a.fieldType,
      fieldName: a.fieldName,
      annotationType: a.annotationType,
      id: a.id
    })));
  }
  
  const formFields = annotations
    .filter(annotation => {
      const isWidget = annotation.subtype === 'Widget';
      const hasFieldType = !!annotation.fieldType;
      const isFormAnnotation = annotation.annotationType === 20;
      return isWidget || hasFieldType || isFormAnnotation;
    })
    .map((annotation, index) => {
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
  
  console.log('Form fields detected:', formFields.length);
  
  return formFields;
}

// Alternative: detect form fields at document level
export async function detectFormFieldsFromDocument(pdfJsDoc) {
  try {
    // Check if document has AcroForm
    const acroForm = await pdfJsDoc.getFieldObjects();
    console.log('AcroForm field objects:', acroForm);
    
    if (acroForm && Object.keys(acroForm).length > 0) {
      const fields = [];
      for (const [name, fieldArray] of Object.entries(acroForm)) {
        for (const field of fieldArray) {
          console.log('Field from AcroForm:', name, field);
          fields.push({
            id: field.id || `field-${name}-${Date.now()}`,
            name: name,
            type: mapAcroFieldType(field.type),
            rect: field.rect || [0, 0, 100, 20],
            value: field.value || '',
            options: field.options || [],
            required: field.required || false,
            readOnly: field.readOnly || false,
            pageIndex: field.page
          });
        }
      }
      return fields;
    }
  } catch (e) {
    console.log('getFieldObjects not available or failed:', e);
  }
  
  return [];
}

function mapAcroFieldType(type) {
  if (type === 'text') return 'text';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'radiobutton') return 'radio';
  if (type === 'combobox' || type === 'listbox') return 'dropdown';
  if (type === 'signature') return 'signature';
  return 'text';
}
