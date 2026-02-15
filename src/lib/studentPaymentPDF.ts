import { format } from 'date-fns';
import logo from '@/assets/extraclasses-logo.webp';

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_date: string;
  session_subject?: string;
  payment_method?: string;
  reference?: string;
}

export function generateStudentPaymentHistoryPDF(payments: Payment[], studentName: string = 'Student') {
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 0 40px; position: relative;">
      <!-- Watermark Background -->
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; opacity: 0.08; z-index: 0; pointer-events: none;">
        <img src="${logo}" alt="" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      
      <!-- Content Wrapper -->
      <div style="position: relative; z-index: 1;">
      <!-- Header with Logo -->
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 3px solid #1e40af;">
        <img src="${logo}" alt="ExtraClasses Ghana" style="height: 200px; margin-bottom: 20px;" />
      </div>

      <!-- Student Info Section -->
      <div style="margin-bottom: 30px; padding-bottom: 20px;">
        <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 5px 0; font-weight: 700;">${studentName}</h1>
        <p style="color: #6b7280; margin: 0; font-size: 13px; font-weight: 600;">Payment History Report</p>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 11px;">Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}</p>
      </div>

      ${payments.length === 0 ? `
        <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 40px; text-align: center; margin: 30px 0;">
          <p style="color: #7f1d1d; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">No Payments Yet</p>
          <p style="color: #7f1d1d; font-size: 12px; margin: 0;">You haven't made any payments. Payment records will appear here when you complete tutoring sessions.</p>
        </div>
      ` : ``}

      <!-- Summary Stats -->
      ${payments.length > 0 ? `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Total Paid</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">GH₵${totalPaid.toFixed(0)}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Pending</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">GH₵${pendingAmount.toFixed(0)}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Transactions</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">${payments.length}</p>
        </div>
      </div>
      ` : ``}

      <!-- Payment Breakdown by Status -->
      ${payments.filter(p => p.status === 'completed').length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #10b981; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">✓ Completed Payments (${payments.filter(p => p.status === 'completed').length})</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #d1fae5; border-bottom: 2px solid #10b981;">
                <th style="padding: 8px; text-align: left; font-weight: 600; color: #065f46;">Date</th>
                <th style="padding: 8px; text-align: left; font-weight: 600; color: #065f46;">Description</th>
                <th style="padding: 8px; text-align: center; font-weight: 600; color: #065f46;">Method</th>
                <th style="padding: 8px; text-align: right; font-weight: 600; color: #065f46;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${payments.filter(p => p.status === 'completed').map((payment, index) => `
                <tr style="background: ${index % 2 === 0 ? '#f0fdf4' : 'white'}; border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${format(new Date(payment.payment_date), 'MMM dd, yyyy')}</td>
                  <td style="padding: 8px;">${payment.session_subject || 'Tutoring Session'}</td>
                  <td style="padding: 8px; text-align: center; font-size: 10px;">${payment.payment_method || 'Unknown'}</td>
                  <td style="padding: 8px; text-align: right; font-weight: 600; color: #10b981;">GH₵${payment.amount.toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Pending Payments -->
      ${payments.filter(p => p.status === 'pending').length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">⏳ Pending Payments (${payments.filter(p => p.status === 'pending').length})</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #fef3c7; border-bottom: 2px solid #f59e0b;">
                <th style="padding: 8px; text-align: left; font-weight: 600; color: #92400e;">Date</th>
                <th style="padding: 8px; text-align: left; font-weight: 600; color: #92400e;">Description</th>
                <th style="padding: 8px; text-align: center; font-weight: 600; color: #92400e;">Method</th>
                <th style="padding: 8px; text-align: right; font-weight: 600; color: #92400e;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${payments.filter(p => p.status === 'pending').map((payment, index) => `
                <tr style="background: ${index % 2 === 0 ? '#fffbeb' : 'white'}; border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${format(new Date(payment.payment_date), 'MMM dd, yyyy')}</td>
                  <td style="padding: 8px;">${payment.session_subject || 'Tutoring Session'}</td>
                  <td style="padding: 8px; text-align: center; font-size: 10px;">${payment.payment_method || 'Unknown'}</td>
                  <td style="padding: 8px; text-align: right; font-weight: 600; color: #f59e0b;">GH₵${payment.amount.toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-top: 40px; text-align: center; font-size: 10px; color: #6b7280;">
        <p style="margin: 5px 0; font-weight: 500;">© 2026 ExtraClasses Ghana. All rights reserved.</p>
        <p style="margin: 8px 0 0 0; font-size: 9px; color: #9ca3af;">For account inquiries, contact support@extraclasses.com.gh</p>
      </div>
      </div>
    </div>
  `;

  return htmlContent;
}
