
import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { jsPDF } from "jspdf";
import { MongoClient } from 'mongodb';
import { format, parseISO } from 'date-fns';

// --- Environment Variables ---
const GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV = process.env.GOOGLE_DRIVE_RECEIPT_FOLDER_ID;
const GOOGLE_SERVICE_ACCOUNT_KEY_PATH_FROM_ENV = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
const GOOGLE_SERVICE_ACCOUNT_JSON_STRING_FROM_ENV = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_STRING;

const DEFAULT_SERVICE_ACCOUNT_KEY_FILENAME = 'google-drive-service-account.json';

let serviceAccountCredentials: any = null;
let googleAuthInitialized = false;

console.log('API Route Module: /api/generate-and-save-receipt/route.ts loaded.');
console.log(`API Route (generate-receipt): Value of GOOGLE_DRIVE_RECEIPT_FOLDER_ID from env: "${GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV}"`);

try {
  console.log('API Route (generate-receipt): Attempting to load Google Service Account credentials at module load.');
  
  if (GOOGLE_SERVICE_ACCOUNT_JSON_STRING_FROM_ENV) {
    console.log('API Route (generate-receipt): Using GOOGLE_SERVICE_ACCOUNT_JSON_STRING from environment.');
    try {
      serviceAccountCredentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON_STRING_FROM_ENV);
      if (serviceAccountCredentials && serviceAccountCredentials.project_id && serviceAccountCredentials.private_key && serviceAccountCredentials.client_email) {
        console.log(`API Route (generate-receipt): Successfully parsed Google Service Account JSON from environment variable. Auth INITIALIZED.`);
        googleAuthInitialized = true;
      } else {
        console.error(`API Route (generate-receipt) CRITICAL ERROR: Parsed JSON from GOOGLE_SERVICE_ACCOUNT_JSON_STRING does not appear to be a valid service account key. Auth NOT initialized.`);
        serviceAccountCredentials = null;
        googleAuthInitialized = false;
      }
    } catch (parseError: any) {
      console.error(`API Route (generate-receipt) CRITICAL ERROR: FAILED TO PARSE Google Service Account key JSON from GOOGLE_SERVICE_ACCOUNT_JSON_STRING. Error: ${parseError.message}. Auth NOT initialized.`);
      serviceAccountCredentials = null;
      googleAuthInitialized = false;
    }
  } else {
    console.log('API Route (generate-receipt): GOOGLE_SERVICE_ACCOUNT_JSON_STRING not set. Trying file path.');
    let resolvedPath: string;
    let usingDefaultPathInfo = "";

    if (GOOGLE_SERVICE_ACCOUNT_KEY_PATH_FROM_ENV) {
        console.log(`API Route (generate-receipt): Using GOOGLE_SERVICE_ACCOUNT_KEY_PATH from environment: ${GOOGLE_SERVICE_ACCOUNT_KEY_PATH_FROM_ENV}`);
        resolvedPath = path.resolve(process.cwd(), GOOGLE_SERVICE_ACCOUNT_KEY_PATH_FROM_ENV);
        usingDefaultPathInfo = `(from GOOGLE_SERVICE_ACCOUNT_KEY_PATH env var: '${GOOGLE_SERVICE_ACCOUNT_KEY_PATH_FROM_ENV}')`;
    } else {
        console.log(`API Route (generate-receipt): GOOGLE_SERVICE_ACCOUNT_KEY_PATH environment variable not set. Using default filename: ${DEFAULT_SERVICE_ACCOUNT_KEY_FILENAME} in project root.`);
        resolvedPath = path.resolve(process.cwd(), DEFAULT_SERVICE_ACCOUNT_KEY_FILENAME);
        usingDefaultPathInfo = `(default path: './${DEFAULT_SERVICE_ACCOUNT_KEY_FILENAME}')`;
    }
    
    console.log(`API Route (generate-receipt): Current working directory for resolving file path: ${process.cwd()}`);
    console.log(`API Route (generate-receipt): EXPECTING service account key file at resolved absolute path: ${resolvedPath} ${usingDefaultPathInfo}`);
    
    if (fs.existsSync(resolvedPath)) {
      console.log(`API Route (generate-receipt): File FOUND at: ${resolvedPath}. Attempting to read and parse.`);
      const keyFileContent = fs.readFileSync(resolvedPath, 'utf-8');
      try {
        serviceAccountCredentials = JSON.parse(keyFileContent);
        if (serviceAccountCredentials && serviceAccountCredentials.project_id && serviceAccountCredentials.private_key && serviceAccountCredentials.client_email) {
          console.log(`API Route (generate-receipt): Successfully loaded and parsed Google Service Account key from file: ${resolvedPath}`);
          console.log(`API Route (generate-receipt): Service account key for project_id "${serviceAccountCredentials.project_id}" seems valid. Auth INITIALIZED.`);
          googleAuthInitialized = true;
        } else {
          console.error(`API Route (generate-receipt) CRITICAL ERROR: Parsed JSON from ${resolvedPath} does not appear to be a valid service account key (missing critical fields like project_id, private_key, or client_email). Auth NOT initialized.`);
          serviceAccountCredentials = null;
          googleAuthInitialized = false;
        }
      } catch (parseError: any) {
        console.error(`API Route (generate-receipt) CRITICAL ERROR: Found file at ${resolvedPath}, but FAILED TO PARSE Google Service Account key JSON. Error: ${parseError.message}. Auth NOT initialized.`);
        console.error('API Route (generate-receipt): Ensure the file contains valid JSON copied directly from Google Cloud Console.');
        console.error('API Route (generate-receipt): Full parse error object:', parseError);
        serviceAccountCredentials = null;
        googleAuthInitialized = false;
      }
    } else {
      console.error(`API Route (generate-receipt) CRITICAL ERROR: Google Service Account key file NOT FOUND at resolved path: ${resolvedPath}. Auth NOT initialized.`);
      if (usingDefaultPathInfo.includes('default')) {
        console.error(`API Route (generate-receipt): This means '${DEFAULT_SERVICE_ACCOUNT_KEY_FILENAME}' was not found in your project root directory: ${process.cwd()}`);
      } else {
        console.error(`API Route (generate-receipt): The path specified in GOOGLE_SERVICE_ACCOUNT_KEY_PATH ('${GOOGLE_SERVICE_ACCOUNT_KEY_PATH_FROM_ENV}') seems incorrect.`);
      }
      console.error(`API Route (generate-receipt): Please ensure the file exists at this location or correctly set the GOOGLE_SERVICE_ACCOUNT_KEY_PATH environment variable, or use GOOGLE_SERVICE_ACCOUNT_JSON_STRING.`);
      googleAuthInitialized = false;
    }
  }
} catch (error: any) {
  console.error('API Route (generate-receipt) CRITICAL UNEXPECTED ERROR during Google Service Account key loading at module level.', error.message);
  console.error('Full Google Service Account initialization error object:', error);
  googleAuthInitialized = false;
}

// Helper function to add an image to the document with page break handling
const addImageToDoc = (label: string | undefined, dataUrl: string | null | undefined, x: number, currentY: number, imgWidth: number, imgHeight: number, doc: any, pageHeight: number, margin: number, lineSpacing: number, aadhaarImageSpacing: number) => {
  let yAfterLabel = currentY;

  if (label) {
    doc.setFont("helvetica", "bold"); // Label in bold
    doc.text(label, x, currentY);
    doc.setFont("helvetica", "normal");
    yAfterLabel = currentY + lineSpacing * 0.9; // Increased space for label
  }

  // Page break check before drawing image
  if (yAfterLabel + imgHeight > pageHeight - margin - 60) { // -60 for footer buffer
      doc.addPage();
      yAfterLabel = margin; // Start from top margin on new page
      // Reset font and print label again if new page
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0,0,0);
      doc.setFont("helvetica", "bold");
      if (label) { // Only reprint label if it was originally provided
        doc.text(label + " (cont.):", x, yAfterLabel - lineSpacing * 0.9); // Reprint label
        doc.setFont("helvetica", "normal");
        yAfterLabel += lineSpacing * 0.9; // Adjust yAfterLabel after reprinting
      }
  }

  if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
    try {
      const imgType = dataUrl.substring(dataUrl.indexOf('/') + 1, dataUrl.indexOf(';')).toUpperCase();
      doc.addImage(dataUrl, imgType, x, yAfterLabel, imgWidth, imgHeight);
      return yAfterLabel + imgHeight + aadhaarImageSpacing; // Return Y after image + spacing
    } catch (e:any) {
      console.error(`API Route (generate-receipt): Error adding image for ${label} to PDF:`, e.message);
      doc.text("(Error embedding image)", x, yAfterLabel);
      return yAfterLabel + lineSpacing; // Advance Y even if error
    }
  } else {
    doc.text("(Not Provided/Uploaded)", x, yAfterLabel);
    return yAfterLabel + lineSpacing; // Advance Y
  }
};

async function generatePdfFromData(data: any): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt', // points
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // approx 595pt for A4
  const pageHeight = doc.internal.pageSize.getHeight(); // approx 841pt for A4
  const margin = 40; 
  let yPos = margin;
  
  const lineSpacing = 17; // Base line spacing
  const sectionSpacing = 28; // Space between major sections
  const itemSpacing = 8; // Space between items in a list or table row
  const subSectionSpacing = 20; // Space between sub-sections or before a table

  const xLeft = margin;
  const xRightAlign = pageWidth - margin;
  const xMid = pageWidth / 2;
  const xRightColStart = xMid + 15; // Start of a potential right column

  // ---- COMPANY HEADER ----
  doc.setFontSize(26); 
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 175, 255); // Sky Blue: hsl(206, 100%, 65%)
  doc.text("DropPurity", xLeft, yPos);
  yPos += lineSpacing * 0.8; // Slightly less than full lineSpacing

  doc.setFontSize(11); 
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100); // Medium gray
  doc.text("Pure Water, Pure Life", xLeft, yPos);
  yPos += sectionSpacing * 0.9; // Space after tagline

  // ---- RECEIPT TITLE & INFO ----
  doc.setFontSize(18); 
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0); // Black
  doc.text("REGISTRATION RECEIPT", xMid, yPos, { align: "center" });
  yPos += lineSpacing * 0.6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50); // Darker gray
  const regDate = data.registeredAt ? parseISO(data.registeredAt) : new Date();
  doc.text(`Receipt No: ${data.receiptNumber || 'N/A'}`, xLeft, yPos + lineSpacing);
  doc.text(`Date: ${format(regDate, "MMMM do, yyyy")}`, xRightAlign, yPos + lineSpacing, { align: "right"});
  yPos += lineSpacing * 2.2; // More space after receipt info
  
  doc.setDrawColor(200, 200, 200); // Lighter gray for separator
  doc.line(xLeft, yPos - (lineSpacing*0.7) , xRightAlign, yPos - (lineSpacing*0.7) );

  // ---- BILLED TO / CUSTOMER DETAILS ----
  doc.setFontSize(12); 
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("BILLED TO:", xLeft, yPos);
  yPos += lineSpacing * 1.3; // Space after "BILLED TO"
  
  doc.setFontSize(11); 
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0); // Black for details

  // Helper to add detail lines, handles multi-line values
  const addDetailLine = (label: string, value: string | undefined | null, currentY: number, boldLabel: boolean = false, valueXOffset: number = 100) => {
    if (value !== undefined && value !== null && value.trim() !== "") {
      const labelWidth = doc.getTextWidth(label + (boldLabel ? "" : ":"));
      // Ensure valueXOffset provides enough space for the label, otherwise adjust
      const effectiveValueXOffset = Math.max(valueXOffset, labelWidth + xLeft + 5);

      if (boldLabel) doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, xLeft, currentY);
      doc.setFont("helvetica", "normal"); // Reset to normal for value
      
      const textLines = doc.splitTextToSize(value, xRightAlign - effectiveValueXOffset - 5); // available width for value
      doc.text(textLines, effectiveValueXOffset, currentY);
      return currentY + (textLines.length * lineSpacing * 0.85); // Advance Y by number of lines
    }
    return currentY; // No value, Y remains unchanged
  };
  
  yPos = addDetailLine("Name", data.customerName, yPos, true, 70);
  if(data.fatherSpouseName) {
    yPos = addDetailLine("S/o / W/o", data.fatherSpouseName, yPos, false, 70);
  }
  
  // Explicit handling for phone numbers to ensure no overlap
  doc.setFont("helvetica", "bold");
  doc.text("Phone:", xLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerPhone || 'N/A', xLeft + 70, yPos);
  yPos += lineSpacing * 0.85;

  if (data.altMobileNo && data.altMobileNo.trim() !== "") {
    doc.setFont("helvetica", "bold");
    doc.text("Alt. Phone:", xLeft, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(data.altMobileNo, xLeft + 70, yPos);
    yPos += lineSpacing * 0.85;
  }

  yPos = addDetailLine("Email", data.emailId, yPos, false, 70);
  
  // Construct full address string
  let addressString = `${data.customerAddress || ''}`;
  if (data.landmark) addressString += `, ${data.landmark}`;
  if (data.city) addressString += `, ${data.city}`;
  if (data.stateName) addressString += `, ${data.stateName}`;
  if (data.pincode) addressString += ` - ${data.pincode}`;
  
  doc.setFont("helvetica", "bold");
  doc.text("Address:", xLeft, yPos);
  doc.setFont("helvetica", "normal");
  // Split address into multiple lines if it's too long
  const addressLines = doc.splitTextToSize(addressString.trim(), xRightAlign - (xLeft + 70) -5 ); 
  doc.text(addressLines, xLeft + 70, yPos);
  yPos += addressLines.length * (lineSpacing * 0.85); // Advance Y by number of lines

  if (data.confirmedMapLink) {
    doc.setFont("helvetica", "bold");
    doc.text("Map Link:", xLeft, yPos);
    
    doc.setFont("helvetica", "normal"); // Reset to normal for value
    doc.setTextColor(0, 0, 255); // Set color to blue for link
    doc.textWithLink(data.confirmedMapLink, xLeft + 70, yPos, {
      url: data.confirmedMapLink,
      underline: true
    });
    doc.setTextColor(0, 0, 0); // Reset color to black
    yPos += lineSpacing; // Advance Y for the map link line
  }
  
  yPos += subSectionSpacing * 0.6; // Space before next section separator
  doc.setDrawColor(200, 200, 200);
  doc.line(xLeft, yPos - (subSectionSpacing/2), xRightAlign, yPos - (subSectionSpacing/2) );

  // ---- SERVICE & PLAN DETAILS (Table) ----
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("SERVICE & PLAN DETAILS:", xLeft, yPos);
  yPos += lineSpacing + itemSpacing; // Space after title, before table headers

  const tableCol1_X = xLeft + 5;
  const tableCol2_X = xLeft + 200; // Start of details column (adjust if needed)
  const tableCol3_X = xRightAlign - 5; // Right edge for amount alignment

  // Table Headers
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Description", tableCol1_X, yPos);
  doc.text("Details", tableCol2_X, yPos);
  doc.text("Amount (₹)", tableCol3_X, yPos, { align: 'right' });
  yPos += itemSpacing * 0.7; // Small space after headers
  doc.setDrawColor(150, 150, 150); // Darker gray for table lines
  doc.line(xLeft, yPos, xRightAlign, yPos); // Line under headers
  yPos += lineSpacing; // Space before first table row

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0); // Black for table content

  // Table Rows
  const planPrice = parseFloat(data.planPrice || '0');
  const securityAmount = parseFloat(data.securityAmount || '0');
  const totalAmount = securityAmount + planPrice;

  let rowContent = `${data.modelInstalled || 'N/A'} (S/N: ${data.serialNumber || 'N/A'})`;
  let textHeight = doc.getTextDimensions(rowContent, {maxWidth: tableCol3_X - tableCol2_X - 15}).h;
  doc.text("Model Installed", tableCol1_X, yPos + textHeight/2 - (doc.getTextDimensions("M").h/2) ); // Vertically align label
  doc.text(rowContent, tableCol2_X, yPos, {maxWidth: tableCol3_X - tableCol2_X - 15});
  doc.text("-", tableCol3_X, yPos, { align: 'right' });
  yPos += textHeight + itemSpacing;

  rowContent = data.planName || data.planSelected || 'N/A'; // Use planName if available
  textHeight = doc.getTextDimensions(rowContent, {maxWidth: tableCol3_X - tableCol2_X - 15}).h;
  doc.text("Plan Selected", tableCol1_X, yPos + textHeight/2 - (doc.getTextDimensions("M").h/2));
  doc.text(rowContent, tableCol2_X, yPos, {maxWidth: tableCol3_X - tableCol2_X - 15});
  doc.text(planPrice.toFixed(2), tableCol3_X, yPos, { align: 'right' });
  yPos += textHeight + itemSpacing;

  rowContent = "Refundable security deposit";
  textHeight = doc.getTextDimensions(rowContent, {maxWidth: tableCol3_X - tableCol2_X - 15}).h;
  doc.text("Security Deposit", tableCol1_X, yPos + textHeight/2 - (doc.getTextDimensions("M").h/2));
  doc.text(rowContent, tableCol2_X, yPos, {maxWidth: tableCol3_X - tableCol2_X - 15});
  doc.text(securityAmount.toFixed(2), tableCol3_X, yPos, { align: 'right' });
  yPos += textHeight + itemSpacing;

  // Line before total
  yPos += itemSpacing / 2;
  doc.setDrawColor(150, 150, 150);
  doc.line(xLeft, yPos, xRightAlign, yPos); 
  yPos += lineSpacing;

  // Total Amount
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT PAID", tableCol2_X + 90, yPos, {align: 'right'}); // Adjust alignment for label
  doc.text(`Rs ${totalAmount.toFixed(2)}`, tableCol3_X, yPos, { align: 'right' });
  yPos += sectionSpacing * 0.9; // Space after total
  doc.setFont("helvetica", "normal"); // Reset font
  doc.setDrawColor(200, 200, 200); // Lighter separator
  doc.line(xLeft, yPos - (sectionSpacing*0.5), xRightAlign, yPos - (sectionSpacing*0.5) );
  
  // ---- PAYMENT DETAILS / WATER QUALITY / OTHER INFO ----
  let leftColY = yPos;
  const xColPayment = xLeft;
  const xColWaterQuality = xRightColStart; // Use defined right column start

  // Helper for left column text (Payment Details)
  const addLeftColText = (label: string, value: string | undefined | null, currentY: number) => {
    if (value !== undefined && value !== null && value.trim() !== "") {
      const textLines = doc.splitTextToSize(`${label}: ${value}`, xRightColStart - xColPayment - 10); // Max width for left col
      doc.text(textLines, xColPayment, currentY);
      return currentY + textLines.length * (lineSpacing * 0.85);
    }
    return currentY;
  };
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("PAYMENT DETAILS:", xColPayment, leftColY);
  leftColY += lineSpacing * 1.3; // Space after title
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0); // Black for details
  
  leftColY = addLeftColText("Customer ID", data.generatedCustomerId, leftColY);
  if (data.installationDate) {
    const installDateObj = parseISO(data.installationDate + 'T00:00:00Z'); // Ensure UTC interpretation if only date string
    const installDateTime = `${format(installDateObj, "MMMM do, yyyy")} at ${data.installationTime || 'N/A'}`;
    leftColY = addLeftColText("Installation", installDateTime, leftColY);
  }
  leftColY = addLeftColText("Payment Method", data.paymentType, leftColY);
  leftColY = addLeftColText("Status", "Paid", leftColY); // Assuming paid for registration
  leftColY = addLeftColText("Aadhaar No.", data.aadhaarNo, leftColY);

  // Right Column: Water Quality
  let rightColY = yPos; // Start at same Y as left column title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("WATER QUALITY:", xColWaterQuality, rightColY); 
  rightColY += lineSpacing * 1.3; // Space after title

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0); // Black for details
  // Helper for right column text
  const addRightColText = (label: string, value: string | undefined | null, currentY: number) => {
     if (value !== undefined && value !== null && value.trim() !== "") {
      const textLines = doc.splitTextToSize(`${label}: ${value}`, xRightAlign - xColWaterQuality - 5); // Max width for right col
      doc.text(textLines, xColWaterQuality, currentY);
      return currentY + textLines.length * (lineSpacing * 0.85);
    }
    return currentY;
  };
  rightColY = addRightColText("TDS Before", data.tdsBefore ? `${data.tdsBefore} ppm` : 'N/A', rightColY);
  rightColY = addRightColText("TDS After", data.tdsAfter ? `${data.tdsAfter} ppm` : 'N/A', rightColY);
  
  // Advance yPos to below the taller of the two columns
  yPos = Math.max(leftColY, rightColY) + subSectionSpacing;
  doc.setDrawColor(200, 200, 200);
  doc.line(xLeft, yPos - (subSectionSpacing/2), xRightAlign, yPos - (subSectionSpacing/2) );

  // ---- AGREEMENT & DOCUMENTS ----
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("AGREEMENT & DOCUMENTS:", xLeft, yPos);
  yPos += lineSpacing * 1.3;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0);
  yPos = addLeftColText("Terms Agreed", data.termsAgreed ? 'Yes' : 'No', yPos); // Use addLeftColText for consistency

  // Aadhaar Images
  let imagesStartY = yPos;
  const aadhaarImageWidth = 250; // Approx 3.47 inches, will stack vertically
  const aadhaarImageHeight = aadhaarImageWidth * (2 / 3.2); // Aspect ratio more like an ID card
  const aadhaarImageSpacing = lineSpacing * 0.8; // Space between images if stacked, or after image block

  // Stack Aadhaar images vertically
  imagesStartY = addImageToDoc("Aadhaar Photo (Front):", data.aadhaarFrontPhotoDataUrl, xLeft, imagesStartY, aadhaarImageWidth, aadhaarImageHeight, doc, pageHeight, margin, lineSpacing, aadhaarImageSpacing);
  imagesStartY += aadhaarImageSpacing / 2; // Extra space between stacked images
  imagesStartY = addImageToDoc("Aadhaar Photo (Back):", data.aadhaarBackPhotoDataUrl, xLeft, imagesStartY, aadhaarImageWidth, aadhaarImageHeight, doc, pageHeight, margin, lineSpacing, aadhaarImageSpacing);
  yPos = imagesStartY; // Update yPos after images


  // Customer Signature
  doc.setFont("helvetica", "bold");
  doc.text("Customer Signature:", xLeft, yPos);
  let signatureY = yPos + lineSpacing * 0.9; // Space for label
  const sigImageWidth = 120; // Smaller for signature
  const sigImageHeight = 60;

  // Page break check for signature
  if (signatureY + sigImageHeight > pageHeight - margin - 60) { // -60 for footer buffer
      doc.addPage();
      signatureY = margin;
      // Reset font and print label again
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0,0,0);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Signature (cont.):", xLeft, signatureY - lineSpacing * 0.9);
      doc.setFont("helvetica", "normal");
      signatureY += lineSpacing * 0.9;
  }

  if (data.signatureDataUrl && typeof data.signatureDataUrl === 'string' && data.signatureDataUrl.startsWith('data:image/png;base64,')) {
    try {
      doc.addImage(data.signatureDataUrl, 'PNG', xLeft, signatureY, sigImageWidth, sigImageHeight); 
      signatureY += sigImageHeight + aadhaarImageSpacing; // Y after signature image
    } catch (e:any) {
      console.error("API Route (generate-receipt): Error adding signature image to PDF:", e.message);
      doc.text('(Error embedding image)', xLeft, signatureY);
      signatureY += lineSpacing * 1.5; // Advance Y
    }
  } else {
    doc.text('Not Captured / Available', xLeft, signatureY);
    signatureY += lineSpacing * 1.5; // Advance Y
  }
  
  yPos = Math.max(signatureY, yPos + lineSpacing) + sectionSpacing * 0.6; // Ensure yPos is below signature

  // ---- CUSTOMER PHOTOGRAPH (Moved to Bottom) ----
  // Calculate the starting Y position for the customer photo near the bottom
  // Leave space for the photo itself and the footer
  const photoWidth = 200;
  const photoHeight = 250;
  const photoX = xMid - (photoWidth / 2); // Center the photo at the bottom
  const footerHeight = lineSpacing * 3 * 0.7 + 20; // Estimate footer height + some buffer
  const photoStartY = pageHeight - margin - footerHeight - photoHeight - (lineSpacing * 1.3) ; // Space for label above

  // Ensure photoStartY is not too close to the last content and not negative
  let customerPhotoActualY = Math.max(yPos, photoStartY);

  if (data.customerPhotoDataUrl) {
    // Add a separator line before the photo section at the bottom
    doc.setDrawColor(200, 200, 200);
    doc.line(xLeft, customerPhotoActualY - (sectionSpacing*0.3), xRightAlign, customerPhotoActualY - (sectionSpacing*0.3) );

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    addImageToDoc("CUSTOMER PHOTOGRAPH:", data.customerPhotoDataUrl, photoX, customerPhotoActualY, photoWidth, photoHeight, doc, pageHeight, margin, lineSpacing, sectionSpacing * 0.6);
  }

  // ---- FOOTER ----
  const footerStartY = pageHeight - margin - 35; // Start Y for footer content from bottom margin
  // Check if content will overlap footer, or if we need to move to designated footer start
  if (yPos > footerStartY - 30) { // If current yPos is already in footer space
     // Avoid adding a new page if we are already very close to the top of a new page (e.g., after an image caused a page break)
     if(!(yPos < margin + 70 && doc.internal.getCurrentPageInfo().pageNumber > 1)){
        doc.addPage();
        yPos = margin; // Reset yPos if new page added for footer, this might not be what we want if footer is fixed
     } else {
       yPos = footerStartY; // If close to top of new page, just use footerStartY
     }
  } else {
    yPos = footerStartY; // If enough space, move to footer start position
  }

  doc.setFontSize(9); 
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120); // Lighter gray for footer
  const footerLine1 = "This is a computer-generated receipt. For any queries, please contact DropPurity support.";
  const footerLine2 = "Email: official@droppurity.com | Phone: 7979784087";
  const footerLine3 = "Thank you for choosing DropPurity!";
  
  doc.text(footerLine1, xMid, yPos, { align: "center" });
  yPos += (lineSpacing * 0.7); // Adjust for smaller font
  doc.text(footerLine2, xMid, yPos, { align: "center" });
  yPos += (lineSpacing * 0.7);
  doc.text(footerLine3, xMid, yPos, { align: "center" });


  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

export async function POST(request: NextRequest) {
  console.log("API Route: /api/generate-and-save-receipt POST handler invoked.");

  if (!googleAuthInitialized || !serviceAccountCredentials) {
    const authErrorMsg = "Google Authentication was NOT initialized. Check server logs.";
    const errorDetails = "Could not load Google Service Account credentials. Please check your Next.js server console logs for messages starting with 'API Route (generate-receipt) CRITICAL ERROR'. These logs will explain if the 'google-drive-service-account.json' file was not found, was invalid, or if there was another issue. Ensure this file is in your project's root directory and contains valid JSON.";
    console.error(`API Route (generate-receipt) CRITICAL FAILURE (FROM POST HANDLER): ${authErrorMsg}. 'googleAuthInitialized' is ${googleAuthInitialized}, 'serviceAccountCredentials' is ${serviceAccountCredentials ? "loaded" : "null"}. CHECK SERVER LOGS (ABOVE THIS MESSAGE) FOR MESSAGES STARTING WITH 'API Route (generate-receipt) CRITICAL ERROR' to see why the file could not be loaded or parsed.`);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server Configuration Error: Google authentication failed.', 
        details: errorDetails
      },
      { status: 500 }
    );
  }
  
  if (!GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV || GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV.trim() === '' || GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
     console.error(`API Route (generate-receipt): CRITICAL ERROR - GOOGLE_DRIVE_RECEIPT_FOLDER_ID not configured or is still the placeholder. Value found: "${GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV}".`);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server Configuration Error: Google Drive folder ID not set or is invalid.', 
        details: `The GOOGLE_DRIVE_RECEIPT_FOLDER_ID environment variable is missing, empty, or still set to the placeholder value "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE" in your .env.local file. Value received: "${GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV}". Please set it to your actual Google Drive folder ID.` 
      },
      { status: 500 }
    );
  }

  let registrationData;
  try {
    registrationData = await request.json();
    console.log("API Route (generate-receipt): Received registration data for receipt generation, keys:", Object.keys(registrationData));
  } catch (jsonError: any) {
    console.error('API Route (generate-receipt): Invalid JSON in request body.', jsonError);
    return NextResponse.json(
      { success: false, message: 'Bad Request: Invalid JSON format.', details: jsonError.message },
      { status: 400 }
    );
  }

  if (!registrationData || !registrationData.generatedCustomerId) {
    console.warn("API Route (generate-receipt): Missing critical registration data (e.g., customer ID) for receipt.");
    return NextResponse.json(
      { success: false, message: 'Bad Request: Incomplete registration data received for receipt.', details: 'Customer ID or other essential data missing.' },
      { status: 400 }
    );
  }

  try {
    console.log(`API Route (generate-receipt): Generating PDF for customer: ${registrationData.generatedCustomerId}`);
    const pdfBuffer = await generatePdfFromData(registrationData); 
    const pdfFileName = `Receipt_${registrationData.generatedCustomerId}_${registrationData.receiptNumber}.pdf`;

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'], 
    });
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: pdfFileName,
      parents: [GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV],
    };

    // const { Readable } = require('stream'); // Already imported at top level
    const pdfStream = Readable.from(pdfBuffer);

    const media = {
      mimeType: 'application/pdf',
      body: pdfStream, 
    };

    console.log(`API Route (generate-receipt): Attempting to upload file "${pdfFileName}" to Google Drive folder ID "${GOOGLE_DRIVE_RECEIPT_FOLDER_ID_FROM_ENV}".`);
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, name', // Fields to get back from the API
    });
    
    const uploadedFile = response.data;
    console.log("API Route (generate-receipt): Google Drive file create response data (uploadedFile):", uploadedFile);
    console.log(`API Route (generate-receipt): Value of uploadedFile.webViewLink: ${uploadedFile.webViewLink}`);


    console.log(`API Route (generate-receipt): File uploaded to Google Drive. ID: ${uploadedFile.id}, Link: ${uploadedFile.webViewLink}, Name: ${uploadedFile.name}`);

    // --- Save Drive Link to MongoDB ---
    const mongoDbUri = process.env.MONGODB_URI;
    if (!mongoDbUri) {
      console.error('API Route (generate-receipt) CRITICAL ERROR: MONGODB_URI environment variable is not set.');
      // Continue without saving to DB, but log the error
    } else {
      let client: MongoClient | null = null;
      try {
        console.log(`API Route (generate-receipt): Attempting to connect to MongoDB to save Drive link for customer: ${registrationData.generatedCustomerId}`);
        client = new MongoClient(mongoDbUri);
        await client.connect();
        const db = client.db('droppurityDB'); // Your database name
        const collection = db.collection('customers'); // Your collection name

        const updateResult = await collection.updateOne(
          { generatedCustomerId: registrationData.generatedCustomerId }, // Query to find the customer
          { $set: { driveUrl: uploadedFile.webViewLink } } // Update to set the driveUrl
        );

        console.log(`API Route (generate-receipt): MongoDB update result for customer ${registrationData.generatedCustomerId}:`, updateResult);

      } catch (dbError: any) {
        console.error('API Route (generate-receipt): Error saving Drive link to MongoDB.', dbError);
      } finally {
        if (client) {
          await client.close();
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Receipt generated and saved to Google Drive.',
        receiptUrl: uploadedFile.webViewLink, // The direct link to view the file in Drive
        fileName: uploadedFile.name, // The name of the file in Drive
      },
      { status: 200 }
    );

  } catch (error: any)
   {
    // Catch all errors during PDF generation or Google Drive upload
    console.error('API Route (generate-receipt): Error during receipt generation or Google Drive upload. Error object:', error);
    let errorMessage = 'An unexpected error occurred during receipt processing.';
    let errorDetails = 'No specific details available.';

    if (error.isGaxiosError) { // Check if it's a Google API client error
        errorMessage = 'Google Drive API Error.';
        errorDetails = error.message; // GaxiosError message is usually informative
        if (error.response && error.response.data && error.response.data.error) {
            errorDetails += ` Details: ${error.response.data.error.message || JSON.stringify(error.response.data.error.errors)}`;
        }
    } else if (error instanceof Error) { // Standard JavaScript Error
        errorDetails = error.message;
    } else if (typeof error === 'string') { // If error is just a string
        errorDetails = error;
    } else { // Fallback for other types of errors
        errorDetails = 'An unknown error structure was caught. Check server logs for the complete error object.';
    }

    const errorResponse = { success: false, message: errorMessage, details: errorDetails };
    console.log(`API Route (generate-receipt): Responding with error. Status: 500, Payload:`, errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
    

    