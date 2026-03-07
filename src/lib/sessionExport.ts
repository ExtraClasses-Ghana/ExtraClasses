import { format } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { generatePDFFromTemplate, createPDFHeader, createPDFFooter } from './pdfExport';

export interface SessionExportData {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration: string;
  session_type: string;
  status: string;
  student_name: string;
  student_email: string;
  teacher_name: string;
  teacher_email: string;
  amount: string;
  platform_fee: string;
  total_amount: string;
  payment_status: string;
  payment_method: string;
  room_code: string;
  created_at: string;
  notes: string;
}

/**
 * Generate PDF export of sessions
 */
export async function generateSessionsPDF(
  sessions: SessionExportData[],
  filters?: { status?: string; dateFrom?: string; dateTo?: string }
): Promise<void> {
  try {
    const htmlContent = generateSessionsPDFTemplate(sessions, filters);
    const filename = `sessions-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`;
    await generatePDFFromTemplate(htmlContent, filename);
  } catch (error) {
    console.error('Error generating sessions PDF:', error);
    throw error;
  }
}

/**
 * Generate Excel export of sessions (CSV format)
 */
export async function generateSessionsExcel(
  sessions: SessionExportData[],
  filename: string = `sessions-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
): Promise<void> {
  try {
    // CSV cannot embed images, so we add a branded header row and a note for professionalism
    const headerNote = '"ExtraClasses Ghana sessions export"\n';
    const csv = headerNote + generateSessionsCSV(sessions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating sessions Excel:', error);
    throw error;
  }
}

/**
 * Generate Word export of sessions (as HTML that can be opened in Word)
 */
export async function generateSessionsWord(
  sessions: SessionExportData[],
  filters?: { status?: string; dateFrom?: string; dateTo?: string }
): Promise<void> {
  try {
    const html = generateSessionsHTMLForWord(sessions, filters);
    const blob = new Blob([html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sessions-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating sessions Word document:', error);
    throw error;
  }
}

/**
 * Generate HTML template for PDF export
 */
function generateSessionsPDFTemplate(
  sessions: SessionExportData[],
  filters?: { status?: string; dateFrom?: string; dateTo?: string }
): string {
  const generatedDate = format(new Date(), 'MMMM dd, yyyy HH:mm:ss');
  // Use absolute path for logo so that it resolves correctly when PDF is generated off-DOM
  const logoUrl = `${window.location.origin}/extraclasses-logo.png`;

  const filterSummary = filters
    ? [
        filters.status && `Status: ${filters.status}`,
        filters.dateFrom && `From: ${filters.dateFrom}`,
        filters.dateTo && `To: ${filters.dateTo}`,
      ]
        .filter(Boolean)
        .join(' | ')
    : '';

  const tableRows = sessions
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px; font-size: 11px;">${s.session_date}</td>
      <td style="padding: 8px; font-size: 11px;">${s.subject}</td>
      <td style="padding: 8px; font-size: 11px;">${s.student_name}</td>
      <td style="padding: 8px; font-size: 11px;">${s.teacher_name}</td>
      <td style="padding: 8px; font-size: 11px;">${s.start_time}</td>
      <td style="padding: 8px; font-size: 11px;">${s.duration}</td>
      <td style="padding: 8px; font-size: 11px;">${s.session_type}</td>
      <td style="padding: 8px; font-size: 11px; text-align: right;">${s.total_amount}</td>
      <td style="padding: 8px; font-size: 11px; text-align: center;">
        <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px;
          ${
            s.status === 'confirmed'
              ? 'background-color: #d1fae5; color: #065f46;'
              : s.status === 'pending'
              ? 'background-color: #fef3c7; color: #92400e;'
              : s.status === 'completed'
              ? 'background-color: #dbeafe; color: #0c2d6b;'
              : 'background-color: #f3f4f6; color: #374151;'
          }">
          ${s.status}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  const totalAmount = sessions.reduce((sum, s) => {
    const amount = parseFloat(s.total_amount.replace(/[^0-9.-]+/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0 40px;">
      ${createPDFHeader(logoUrl)}
      
      <div style="margin-bottom: 20px; text-align: justify;">
        <h2 style="color: #1e40af; margin-bottom: 10px;">Sessions Export Report</h2>
        <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
          <strong>Generated:</strong> ${generatedDate}
        </p>
        <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
          <strong>Total Records:</strong> ${sessions.length}
        </p>
        <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
          <strong>Total Revenue:</strong> GH₵${totalAmount.toFixed(2)}
        </p>
        ${
          filterSummary
            ? `<p style="margin: 5px 0; font-size: 12px; color: #6b7280;"><strong>Filters:</strong> ${filterSummary}</p>`
            : ''
        }
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #d1d5db;">
        <thead>
          <tr style="background-color: #f3f4f6; border-bottom: 2px solid #1e40af;">
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Date</th>
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Subject</th>
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Student</th>
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Teacher</th>
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Start Time</th>
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Duration</th>
            <th style="padding: 10px; text-align: left; font-weight: bold; font-size: 12px; color: #1f2937;">Type</th>
            <th style="padding: 10px; text-align: right; font-weight: bold; font-size: 12px; color: #1f2937;">Amount</th>
            <th style="padding: 10px; text-align: center; font-weight: bold; font-size: 12px; color: #1f2937;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      ${createPDFFooter(generatedDate)}
    </div>
  `;
}

/**
 * Generate CSV data from sessions
 */
function generateSessionsCSV(sessions: SessionExportData[]): string {
  const headers = [
    'Session ID',
    'Date',
    'Subject',
    'Student Name',
    'Student Email',
    'Teacher Name',
    'Teacher Email',
    'Start Time',
    'End Time',
    'Duration',
    'Session Type',
    'Amount',
    'Platform Fee',
    'Total Amount',
    'Status',
    'Payment Status',
    'Payment Method',
    'Room Code',
    'Notes',
    'Created At',
  ];

  const rows = sessions.map((s) => [
    `"${s.id}"`,
    `"${s.session_date}"`,
    `"${s.subject}"`,
    `"${s.student_name}"`,
    `"${s.student_email}"`,
    `"${s.teacher_name}"`,
    `"${s.teacher_email}"`,
    `"${s.start_time}"`,
    `"${s.end_time}"`,
    `"${s.duration}"`,
    `"${s.session_type}"`,
    `"${s.amount}"`,
    `"${s.platform_fee}"`,
    `"${s.total_amount}"`,
    `"${s.status}"`,
    `"${s.payment_status}"`,
    `"${s.payment_method}"`,
    `"${s.room_code}"`,
    `"${s.notes.replace(/"/g, '""')}"`,
    `"${s.created_at}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generate HTML for Word document export
 */
function generateSessionsHTMLForWord(
  sessions: SessionExportData[],
  filters?: { status?: string; dateFrom?: string; dateTo?: string }
): string {
  const generatedDate = format(new Date(), 'MMMM dd, yyyy HH:mm:ss');
  // ensure logo resolves when doc is opened in Word
  const logoUrl = `${window.location.origin}/extraclasses-logo.png`;

  const filterSummary = filters
    ? [
        filters.status && `Status: ${filters.status}`,
        filters.dateFrom && `From: ${filters.dateFrom}`,
        filters.dateTo && `To: ${filters.dateTo}`,
      ]
        .filter(Boolean)
        .join(' | ')
    : '';

  const tableRows = sessions
    .map(
      (s) => `
    <tr>
      <td style="border: 1px solid #999; padding: 8px;">${s.session_date}</td>
      <td style="border: 1px solid #999; padding: 8px;">${s.subject}</td>
      <td style="border: 1px solid #999; padding: 8px;">${s.student_name}</td>
      <td style="border: 1px solid #999; padding: 8px;">${s.teacher_name}</td>
      <td style="border: 1px solid #999; padding: 8px;">${s.start_time}</td>
      <td style="border: 1px solid #999; padding: 8px;">${s.duration}</td>
      <td style="border: 1px solid #999; padding: 8px;">${s.session_type}</td>
      <td style="border: 1px solid #999; padding: 8px; text-align: right;">${s.total_amount}</td>
      <td style="border: 1px solid #999; padding: 8px; text-align: center;">${s.status}</td>
    </tr>
  `
    )
    .join('');

  const totalAmount = sessions.reduce((sum, s) => {
    const amount = parseFloat(s.total_amount.replace(/[^0-9.-]+/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 1in; }
          h1 { color: #1e40af; margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #d1d5db; }
          th { background-color: #f3f4f6; border: 1px solid #999; padding: 10px; text-align: left; font-weight: bold; }
          td { vertical-align: top; }
          .info-section { margin-bottom: 20px; text-align: justify; }
          .info-section p { margin: 5px 0; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header img { height: 60px; display: block; margin: 0 auto 10px auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="ExtraClasses Ghana" />
          <h1>Sessions Export Report</h1>
        </div>
        
        <div class="info-section">
          <p><strong>Generated:</strong> ${generatedDate}</p>
          <p><strong>Total Records:</strong> ${sessions.length}</p>
          <p><strong>Total Revenue:</strong> GH₵${totalAmount.toFixed(2)}</p>
          ${
            filterSummary
              ? `<p><strong>Filters Applied:</strong> ${filterSummary}</p>`
              : ''
          }
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Student</th>
              <th>Teacher</th>
              <th>Start Time</th>
              <th>Duration</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #999; font-size: 11px; color: #666;">
          <p style="margin: 5px 0;">Generated on ${generatedDate}</p>
          <p style="margin: 5px 0;">© 2026 ExtraClasses Ghana. All rights reserved.</p>
          <p style="margin: 5px 0; font-style: italic;">This is an official document from ExtraClasses Ghana</p>
        </div>
      </body>
    </html>
  `;
}
