import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';

interface PDFOptions {
  title: string;
  filename: string;
  logo?: string;
}

export async function generatePDFFromHTML(
  elementId: string,
  options: PDFOptions
): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Create canvas from HTML
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    // Convert canvas into slices that fit A4 pages, embed each slice into pdf-lib
    const mmToPt = (mm: number) => (mm * 72) / 25.4;
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const A4_WIDTH_PTS = mmToPt(A4_WIDTH_MM);
    const A4_HEIGHT_PTS = mmToPt(A4_HEIGHT_MM);

    // Determine slice height in pixels that corresponds to A4 aspect ratio
    const sliceHeightPx = Math.floor((A4_HEIGHT_MM / A4_WIDTH_MM) * canvas.width);

    const pdfDoc = await PDFDocument.create();

    let remainingHeight = canvas.height;
    let offsetY = 0;

    while (remainingHeight > 0) {
      const currentSliceHeight = Math.min(sliceHeightPx, remainingHeight);

      // Create a temp canvas for the slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSliceHeight;
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(canvas, 0, -offsetY);

      const sliceDataUrl = sliceCanvas.toDataURL('image/png');

      // Convert dataURL to Uint8Array
      const base64 = sliceDataUrl.split(',')[1];
      const binary = atob(base64);
      const uint8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8[i] = binary.charCodeAt(i);
      }

      const pngImage = await pdfDoc.embedPng(uint8);

      const imgWidthPts = A4_WIDTH_PTS;
      const imgHeightPts = (currentSliceHeight / canvas.width) * imgWidthPts;

      const page = pdfDoc.addPage([A4_WIDTH_PTS, A4_HEIGHT_PTS]);
      // Draw image at top-left of the page
      page.drawImage(pngImage, {
        x: 0,
        y: A4_HEIGHT_PTS - imgHeightPts,
        width: imgWidthPts,
        height: imgHeightPts,
      });

      offsetY += currentSliceHeight;
      remainingHeight -= currentSliceHeight;
    }

    const pdfBytes = await pdfDoc.save();
    // Trigger download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = options.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export function createPDFHeader(logo: string): string {
  return `
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px;">
      <img src="${logo}" alt="ExtraClasses Ghana" style="height: 50px; margin-bottom: 15px;" />
      <h1 style="color: #1e40af; font-size: 28px; margin: 10px 0 5px 0;">ExtraClasses Ghana</h1>
      <p style="color: #6b7280; font-size: 12px; margin: 0;">Professional Online & In-Person Tutoring Platform</p>
    </div>
  `;
}

export function createPDFFooter(generatedDate: string): string {
  return `
    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; text-align: center; font-size: 11px; color: #6b7280;">
      <p style="margin: 5px 0;">Generated on ${generatedDate}</p>
      <p style="margin: 5px 0;">© 2026 ExtraClasses Ghana. All rights reserved.</p>
      <p style="margin: 5px 0; font-style: italic;">This is an official document from ExtraClasses Ghana</p>
    </div>
  `;
}

/**
 * Generates PDF from an HTML template string
 * Creates temporary DOM element, renders PDF, and triggers download
 */
export async function generatePDFFromTemplate(
  htmlContent: string,
  filename: string
): Promise<void> {
  try {
    // Create temporary container
    const tempContainer = document.createElement('div');
    tempContainer.id = `pdf-temp-${Date.now()}`;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm'; // A4 width
    tempContainer.innerHTML = htmlContent;
    document.body.appendChild(tempContainer);

    // Generate PDF
    await generatePDFFromHTML(tempContainer.id, {
      title: filename,
      filename: `${filename}.pdf`,
    });

    // Cleanup
    document.body.removeChild(tempContainer);
  } catch (error) {
    console.error('Error generating PDF from template:', error);
    throw error;
  }
}
