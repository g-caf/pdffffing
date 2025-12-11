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
  console.log('=== detectFormFields called ===');
  console.log('Page object:', pdfJsPage);
  console.log('Page number:', pdfJsPage.pageNumber);

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

  // Log ALL annotation data for debugging
  if (annotations.length > 0) {
    console.log('Total annotations found:', annotations.length);
    annotations.forEach((a, idx) => {
      console.log(`Annotation ${idx}:`, {
        subtype: a.subtype,
        fieldType: a.fieldType,
        fieldName: a.fieldName,
        annotationType: a.annotationType,
        id: a.id,
        rect: a.rect,
        hasFieldType: !!a.fieldType,
        isWidget: a.subtype === 'Widget',
        allKeys: Object.keys(a)
      });
    });
  } else {
    console.log('NO annotations found on this page');
  }

  const formFields = annotations
    .filter(annotation => {
      const isWidget = annotation.subtype === 'Widget';
      const hasFieldType = !!annotation.fieldType;
      const isFormAnnotation = annotation.annotationType === 20;
      const matches = isWidget || hasFieldType || isFormAnnotation;

      if (!matches && annotation.subtype) {
        console.log(`Filtered out annotation with subtype: ${annotation.subtype}`);
      }

      return matches;
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
      console.log('Mapped form field:', field);
      return field;
    });

  console.log('Form fields detected (final):', formFields.length);
  console.log('=== detectFormFields complete ===');

  return formFields;
}

// Alternative: detect form fields at document level
export async function detectFormFieldsFromDocument(pdfJsDoc) {
  console.log('=== detectFormFieldsFromDocument called ===');
  console.log('pdfJsDoc object:', pdfJsDoc);
  console.log('pdfJsDoc has getFieldObjects?', typeof pdfJsDoc?.getFieldObjects);

  // Check for XFA forms
  try {
    if (typeof pdfJsDoc.getXfa === 'function') {
      const xfa = await pdfJsDoc.getXfa();
      console.log('XFA data:', xfa);
      if (xfa) {
        console.log('WARNING: This PDF uses XFA forms, which are not fully supported by PDF.js');
      }
    }
  } catch (e) {
    console.log('XFA check failed:', e.message);
  }

  // Check document metadata
  try {
    const metadata = await pdfJsDoc.getMetadata();
    console.log('PDF Metadata:', metadata);
  } catch (e) {
    console.log('Metadata check failed:', e.message);
  }

  // Check if there's a Catalog
  try {
    const data = await pdfJsDoc.getData();
    console.log('PDF has data, length:', data?.length);
  } catch (e) {
    console.log('getData failed:', e.message);
  }

  try {
    // Check if document has AcroForm
    const acroForm = await pdfJsDoc.getFieldObjects();
    console.log('AcroForm field objects result:', acroForm);
    console.log('AcroForm type:', typeof acroForm);
    console.log('AcroForm keys:', acroForm ? Object.keys(acroForm) : 'null');

    if (acroForm && Object.keys(acroForm).length > 0) {
      console.log(`Found ${Object.keys(acroForm).length} form fields in document`);
      const fields = [];
      for (const [name, fieldArray] of Object.entries(acroForm)) {
        console.log(`Processing field "${name}":`, fieldArray);
        for (const field of fieldArray) {
          console.log('Field details:', {
            name,
            type: field.type,
            page: field.page,
            rect: field.rect,
            value: field.value,
            allKeys: Object.keys(field)
          });

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
      console.log(`Returning ${fields.length} fields from document-level detection`);
      return fields;
    } else {
      console.log('No AcroForm fields found in document');
    }
  } catch (e) {
    console.error('getFieldObjects error:', e);
    console.error('Error stack:', e.stack);
  }

  console.log('=== detectFormFieldsFromDocument returning empty array ===');
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
