import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createFillableForm() {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Add a page
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  // Get fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Get the form
  const form = pdfDoc.getForm();

  let y = height - 50;

  // Title
  page.drawText('MEMBERSHIP REGISTRATION FORM', {
    x: 150,
    y: y,
    size: 16,
    font: boldFont,
  });

  y -= 40;

  // Helper function to add text field
  function addTextField(name, label, x, y, width = 200, height = 20) {
    page.drawText(label, {
      x: x,
      y: y + 5,
      size: 10,
      font: font,
    });

    const textField = form.createTextField(name);
    textField.addToPage(page, {
      x: x + label.length * 6 + 10,
      y: y,
      width: width,
      height: height,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });

    return textField;
  }

  // Helper function to add checkbox
  function addCheckBox(name, label, x, y, size = 12) {
    const checkBox = form.createCheckBox(name);
    checkBox.addToPage(page, {
      x: x,
      y: y,
      width: size,
      height: size,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });

    page.drawText(label, {
      x: x + size + 5,
      y: y + 2,
      size: 9,
      font: font,
    });

    return checkBox;
  }

  // Name and Date of Birth
  addTextField('name', 'NAME:', 50, y, 300);
  addTextField('dob', 'DATE OF BIRTH:', 400, y, 150);
  y -= 30;

  // Address
  addTextField('address', 'ADDRESS:', 50, y, 500);
  y -= 30;

  // City, State, Zip
  addTextField('city', 'CITY:', 50, y, 150);
  addTextField('state', 'STATE:', 230, y, 50);
  addTextField('zip', 'ZIP CODE:', 310, y, 100);
  y -= 30;

  // Phone and Email
  addTextField('phone', 'PHONE:', 50, y, 150);
  addTextField('email', 'EMAIL:', 230, y, 320);
  y -= 30;

  // Home Borough and Rec Center
  addTextField('borough', 'HOME BOROUGH:', 50, y, 150);
  addTextField('recCenter', 'HOME REC CENTER:', 230, y, 320);
  y -= 30;

  // Emergency Contact
  page.drawText('IN CASE OF EMERGENCY, PLEASE NOTIFY:', {
    x: 50,
    y: y + 5,
    size: 10,
    font: boldFont,
  });
  y -= 20;

  addTextField('emergencyName', 'NAME:', 50, y, 200);
  addTextField('emergencyRelationship', 'RELATIONSHIP:', 280, y, 120);
  addTextField('emergencyPhone', 'PHONE:', 430, y, 120);
  y -= 40;

  // Race/Ethnicity Section
  page.drawText('Which of the following best describes your racial or ethnic identity?', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 20;

  // Race checkboxes - Column 1
  addCheckBox('race_native', 'American Indian or Alaskan Native', 50, y);
  y -= 18;
  addCheckBox('race_black', 'Black or African American', 50, y);
  y -= 18;
  addCheckBox('race_hawaiian', 'Native Hawaiian or Pacific Islander', 50, y);
  y -= 18;
  addCheckBox('race_no_answer', 'Prefer not to answer', 50, y);

  // Race checkboxes - Column 2
  let y2 = y + 54;
  addCheckBox('race_middle_eastern', 'Middle Eastern or North African', 250, y2);
  y2 -= 18;
  addCheckBox('race_hispanic', 'Hispanic or Latino/a/x', 250, y2);
  y2 -= 18;
  addCheckBox('race_white', 'White', 250, y2);

  // Race checkboxes - Column 3
  let y3 = y + 54;
  addCheckBox('race_biracial', 'Biracial/Multiracial', 450, y3);
  y3 -= 18;
  addCheckBox('race_asian', 'Asian', 450, y3);
  y3 -= 18;
  addCheckBox('race_other', 'Other', 450, y3);

  y -= 40;

  // Income Section
  page.drawText('Which of the following best describes your household\'s total annual income?', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 20;

  // Income checkboxes
  addCheckBox('income_0_32', '$0-32,999', 50, y);
  addCheckBox('income_33_53', '$33,000-53,999', 200, y);
  addCheckBox('income_54_106', '$54,000-106,999', 350, y);
  y -= 18;
  addCheckBox('income_107', '$107,000+', 50, y);
  addCheckBox('income_no_answer', 'Prefer not to answer', 200, y);
  addCheckBox('income_unemployed', 'Unemployed', 350, y);

  y -= 40;

  // Membership Type Section
  page.drawText('Available Membership Packages: Please select one', {
    x: 50,
    y: y,
    size: 11,
    font: boldFont,
  });
  y -= 25;

  // Create radio button groups for membership
  const membershipGroup = form.createRadioGroup('membershipType');

  function addRadioButton(groupName, optionValue, label, x, y) {
    const group = form.getRadioGroup(groupName);
    group.addOptionToPage(optionValue, page, {
      x: x,
      y: y,
      width: 12,
      height: 12,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });

    page.drawText(label, {
      x: x + 17,
      y: y + 2,
      size: 9,
      font: font,
    });
  }

  // Adults section
  page.drawText('Adults (Ages 25-61)', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 18;
  addRadioButton('membershipType', 'adult_annual_pool', 'Annual Indoor Pool & Recreation Centers - $150.00', 50, y);
  y -= 16;
  addRadioButton('membershipType', 'adult_6month_pool', '6-month Indoor Pool & Recreation Centers - $75.00', 50, y);
  y -= 16;
  addRadioButton('membershipType', 'adult_annual_rec', 'Annual Recreation Centers Only - $100.00', 50, y);
  y -= 16;
  addRadioButton('membershipType', 'adult_6month_rec', '6-month Recreation Centers Only - $50.00', 50, y);

  y -= 25;

  // Seniors section
  page.drawText('Seniors (Ages 62+)', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 18;
  addRadioButton('membershipType', 'senior_annual', 'Annual Indoor Pool & Recreation Centers - $25.00', 50, y);

  y -= 20;

  // Other categories
  page.drawText('Person with Disability', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 18;
  addRadioButton('membershipType', 'disability_annual', 'Annual Indoor Pool & Recreation Centers - $25.00', 50, y);

  y -= 20;

  page.drawText('Veteran', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 18;
  addRadioButton('membershipType', 'veteran_annual', 'Annual Indoor Pool & Recreation Centers - $25.00', 50, y);

  y -= 20;

  page.drawText('Young Adults (Ages 18-24)', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 18;
  addRadioButton('membershipType', 'young_adult', 'Annual Indoor Pool & Recreation Centers - FREE WITH ID', 50, y);

  y -= 20;

  page.drawText('Youth (Ages 0-17)', {
    x: 50,
    y: y,
    size: 10,
    font: boldFont,
  });
  y -= 18;
  addRadioButton('membershipType', 'youth', 'Annual Indoor Pool & Recreation Centers - FREE WITH ID', 50, y);

  y -= 35;

  // Signature fields
  addTextField('signature', 'Member Signature:', 50, y, 300);
  addTextField('signatureDate', 'Date:', 400, y, 150);
  y -= 30;

  addTextField('printName', 'Print Name:', 50, y, 300);

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('NYC-Parks-Registration-Fillable.pdf', pdfBytes);

  console.log('Fillable PDF created: NYC-Parks-Registration-Fillable.pdf');
  console.log('Total form fields created:', form.getFields().length);
}

createFillableForm().catch(console.error);
