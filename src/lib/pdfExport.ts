import jsPDF from 'jspdf';
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

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height

    // Add subsequent pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(options.filename);
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
