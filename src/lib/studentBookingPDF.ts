import { format } from 'date-fns';
import logo from '@/assets/extraclasses-logo.webp';

interface BookingSession {
  id: string;
  subject: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  amount: number;
  teacher?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function generateStudentBookingHistoryPDF(sessions: BookingSession[], studentName: string = 'Student') {
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
        <p style="color: #6b7280; margin: 0; font-size: 13px; font-weight: 600;">Booking History Report</p>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 11px;">Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}</p>
      </div>

      ${sessions.length === 0 ? `
        <div style="background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; padding: 40px; text-align: center; margin: 30px 0;">
          <p style="color: #0c4a6e; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">No Bookings Yet</p>
          <p style="color: #0c4a6e; font-size: 12px; margin: 0;">You haven't made any bookings. When you book sessions with teachers, they will appear here.</p>
        </div>
      ` : ``}

      <!-- Summary Stats -->
      ${sessions.length > 0 ? `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Total Sessions</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">${sessions.length}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Completed</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">${sessions.filter(s => s.status === 'completed').length}</p>
        </div>
        <div style="background: #f3f4f6; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
          <p style="color: #6b7280; margin: 0; font-size: 11px; text-transform: uppercase;">Total Cost</p>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0 0;">GH₵${sessions.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</p>
        </div>
      </div>

      <!-- Sessions Table -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Session Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #1e40af; color: white;">
              <th style="padding: 10px; text-align: left; font-weight: 600;">Date & Time</th>
              <th style="padding: 10px; text-align: left; font-weight: 600;">Teacher</th>
              <th style="padding: 10px; text-align: left; font-weight: 600;">Subject</th>
              <th style="padding: 10px; text-align: center; font-weight: 600;">Duration</th>
              <th style="padding: 10px; text-align: center; font-weight: 600;">Type</th>
              <th style="padding: 10px; text-align: right; font-weight: 600;">Cost</th>
              <th style="padding: 10px; text-align: center; font-weight: 600;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map((session, index) => `
              <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; text-align: left;">
                  <div style="font-weight: 600;">${format(new Date(session.session_date), 'MMM dd, yyyy')}</div>
                  <div style="color: #6b7280; font-size: 10px;">${session.start_time.slice(0, 5)}</div>
                </td>
                <td style="padding: 10px;">${session.teacher?.full_name || 'N/A'}</td>
                <td style="padding: 10px;">${session.subject}</td>
                <td style="padding: 10px; text-align: center;">${session.duration_minutes} min</td>
                <td style="padding: 10px; text-align: center;">
                  <span style="background: ${session.session_type === 'online' ? '#dcfce7' : '#fef3c7'}; color: ${session.session_type === 'online' ? '#15803d' : '#92400e'}; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">
                    ${session.session_type === 'online' ? 'Online' : 'In-Person'}
                  </span>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">GH₵${session.amount.toFixed(0)}</td>
                <td style="padding: 10px; text-align: center;">
                  <span style="background: ${
                    session.status === 'completed' ? '#d1fae5' :
                    session.status === 'confirmed' ? '#bfdbfe' :
                    session.status === 'pending' ? '#fef3c7' :
                    '#fedcdc'
                  }; color: ${
                    session.status === 'completed' ? '#065f46' :
                    session.status === 'confirmed' ? '#0c4a6e' :
                    session.status === 'pending' ? '#92400e' :
                    '#991b1b'
                  }; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 500; text-transform: capitalize;">
                    ${session.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ``}

      <!-- Footer -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-top: 40px; text-align: center; font-size: 10px; color: #6b7280;">
        <p style="margin: 5px 0; font-weight: 500;">© 2026 ExtraClasses Ghana. All rights reserved.</p>
        <p style="margin: 8px 0 0 0; font-size: 9px; color: #9ca3af;">This is an official document from ExtraClasses Ghana</p>
      </div>
      </div>
    </div>
  `;

  return htmlContent;
}
