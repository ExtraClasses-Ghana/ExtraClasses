import { format, startOfMonth, endOfMonth } from 'date-fns';
import logo from '@/assets/extraclasses-logo.webp';

interface EarningRecord {
  id: string;
  amount: number;
  session_date: string;
  status: string;
  student_name?: string;
  subject?: string;
}

export function generateTeacherEarningsPDF(earnings: EarningRecord[], teacherName: string) {
  const totalEarnings = earnings.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0);
  const totalPending = earnings.filter(e => e.status !== 'completed').reduce((sum, e) => sum + e.amount, 0);
  const completedSessions = earnings.filter(e => e.status === 'completed').length;

  // Calculate monthly breakdown
  const monthlyBreakdown: { [key: string]: number } = {};
  earnings.filter(e => e.status === 'completed').forEach(earning => {
    const monthKey = format(new Date(earning.session_date), 'MMMM yyyy');
    monthlyBreakdown[monthKey] = (monthlyBreakdown[monthKey] || 0) + earning.amount;
  });

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

      <!-- Teacher Info & Title Section -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 15px 0; font-weight: 700;">${teacherName}</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px; font-weight: 600;">Earnings & Analytics Report</p>
        <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 11px;">Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}</p>
      </div>

      ${earnings.length === 0 ? `
        <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 40px; text-align: center; margin: 30px 0;">
          <p style="color: #7f1d1d; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">No Earnings Yet</p>
          <p style="color: #7f1d1d; font-size: 12px; margin: 0;">You haven't earned any income yet. When you complete teaching sessions, your earnings will appear here.</p>
        </div>
      ` : ``}

      <!-- Key Metrics -->
      ${earnings.length > 0 ? `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Total Earnings</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">GH₵${totalEarnings.toFixed(0)}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Sessions</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">${completedSessions}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Pending Balance</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">GH₵${totalPending.toFixed(0)}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #8b5cf6; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Avg Per Session</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">GH₵${(completedSessions > 0 ? totalEarnings / completedSessions : 0).toFixed(0)}</p>
        </div>
      </div>
      ` : ``}

      <!-- Monthly Breakdown -->
      ${Object.keys(monthlyBreakdown).length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Monthly Earnings Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #1e40af; color: white;">
                <th style="padding: 10px; text-align: left; font-weight: 600;">Month</th>
                <th style="padding: 10px; text-align: right; font-weight: 600;">Earnings</th>
                <th style="padding: 10px; text-align: center; font-weight: 600;">Sessions</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(monthlyBreakdown).map((entry, index) => {
                const monthSessions = earnings.filter(e => 
                  e.status === 'completed' && 
                  format(new Date(e.session_date), 'MMMM yyyy') === entry[0]
                ).length;
                return `
                  <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; font-weight: 500;">${entry[0]}</td>
                    <td style="padding: 10px; text-align: right; font-weight: 600; color: #10b981;">GH₵${entry[1].toFixed(0)}</td>
                    <td style="padding: 10px; text-align: center;">${monthSessions}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Recent Earnings Details -->
      ${earnings.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Recent Earnings</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #1e40af; color: white;">
              <th style="padding: 8px; text-align: left; font-weight: 600;">Date</th>
              <th style="padding: 8px; text-align: left; font-weight: 600;">Student</th>
              <th style="padding: 8px; text-align: left; font-weight: 600;">Subject</th>
              <th style="padding: 8px; text-align: center; font-weight: 600;">Status</th>
              <th style="padding: 8px; text-align: right; font-weight: 600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${earnings.slice(0, 20).map((earning, index) => `
              <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px;">${format(new Date(earning.session_date), 'MMM dd, yyyy')}</td>
                <td style="padding: 8px;">${earning.student_name || 'N/A'}</td>
                <td style="padding: 8px;">${earning.subject || 'N/A'}</td>
                <td style="padding: 8px; text-align: center;">
                  <span style="background: ${
                    earning.status === 'completed' ? '#d1fae5' :
                    earning.status === 'confirmed' ? '#bfdbfe' :
                    '#fef3c7'
                  }; color: ${
                    earning.status === 'completed' ? '#065f46' :
                    earning.status === 'confirmed' ? '#0c4a6e' :
                    '#92400e'
                  }; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 500;">
                    ${earning.status === 'completed' ? 'Paid' : earning.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </span>
                </td>
                <td style="padding: 8px; text-align: right; font-weight: 600;">GH₵${earning.amount.toFixed(0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Key Insights -->
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
        <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 12px; font-weight: 600;">📊 Quick Insights</h4>
        <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 11px;">
          <li>Average earning per session: <strong>GH₵${(completedSessions > 0 ? totalEarnings / completedSessions : 0).toFixed(0)}</strong></li>
          <li>Total completed sessions: <strong>${completedSessions}</strong></li>
          <li>Pending balance: <strong>GH₵${totalPending.toFixed(0)}</strong></li>
          ${Object.keys(monthlyBreakdown).length > 0 ? `<li>Best month: <strong>${Object.entries(monthlyBreakdown).reduce((a, b) => b[1] > a[1] ? b : a)[0]}</strong></li>` : ''}
        </ul>
      </div>
      ` : ``}

      <!-- Footer -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-top: 40px; text-align: center; font-size: 10px; color: #6b7280;">
        <p style="margin: 5px 0; font-weight: 500;">© 2026 ExtraClasses Ghana. All rights reserved.</p>
        <p style="margin: 8px 0 0 0; font-size: 9px; color: #9ca3af;">For account inquiries or disputes, contact support@extraclasses.com.gh</p>
      </div>
      </div>
    </div>
  `;

  return htmlContent;
}
