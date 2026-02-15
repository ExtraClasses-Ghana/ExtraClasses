import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_API_URL = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  to: string;
  studentName: string;
  teacherName: string;
  subject: string;
  date: string;
  time: string;
  sessionType: string;
  amount: number;
}

interface SessionReminderRequest {
  to: string;
  studentName: string;
  teacherName: string;
  subject: string;
  date: string;
  time: string;
  hoursUntil: number;
}

interface PaymentReceiptRequest {
  to: string;
  studentName: string;
  teacherName: string;
  subject: string;
  amount: number;
  transactionRef: string;
  date: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EDULINK Ghana <noreply@edulink.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured. Email notifications are disabled.");
    }

    // Booking confirmation email
    if (action === "booking-confirmation" && req.method === "POST") {
      const body: BookingConfirmationRequest = await req.json();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #006B3F, #FFD700); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Booking Confirmed! 🎉</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hi ${body.studentName},</p>
            <p>Great news! Your tutoring session has been confirmed.</p>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #006B3F;">Session Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Teacher:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${body.teacherName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Subject:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${body.subject}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Date:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${body.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Time:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${body.time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Type:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${body.sessionType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Amount:</td>
                  <td style="padding: 8px 0; font-weight: bold;">GH₵${body.amount}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666;">We'll send you a reminder before your session.</p>
            <p>Best regards,<br/>The EDULINK Ghana Team</p>
          </div>
        </div>
      `;

      const emailResponse = await sendEmail(body.to, "Booking Confirmed - EDULINK Ghana", html);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Session reminder email
    if (action === "session-reminder" && req.method === "POST") {
      const body: SessionReminderRequest = await req.json();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #006B3F, #FFD700); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Session Reminder ⏰</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hi ${body.studentName},</p>
            <p>This is a friendly reminder that your tutoring session is coming up in <strong>${body.hoursUntil} hour(s)</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #006B3F;">Session Details</h3>
              <p><strong>Teacher:</strong> ${body.teacherName}</p>
              <p><strong>Subject:</strong> ${body.subject}</p>
              <p><strong>Date:</strong> ${body.date}</p>
              <p><strong>Time:</strong> ${body.time}</p>
            </div>
            
            <p style="color: #666;">Make sure you're prepared and have a stable internet connection if it's an online session.</p>
            <p>Best regards,<br/>The EDULINK Ghana Team</p>
          </div>
        </div>
      `;

      const emailResponse = await sendEmail(body.to, `Reminder: Session in ${body.hoursUntil} hour(s) - EDULINK Ghana`, html);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Payment receipt email
    if (action === "payment-receipt" && req.method === "POST") {
      const body: PaymentReceiptRequest = await req.json();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #006B3F, #FFD700); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Receipt 💳</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hi ${body.studentName},</p>
            <p>Thank you for your payment. Here's your receipt:</p>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px dashed #006B3F;">
              <h3 style="margin-top: 0; color: #006B3F; text-align: center;">PAYMENT RECEIPT</h3>
              <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;" />
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Transaction Ref:</td>
                  <td style="padding: 8px 0; font-family: monospace;">${body.transactionRef}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Date:</td>
                  <td style="padding: 8px 0;">${body.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Teacher:</td>
                  <td style="padding: 8px 0;">${body.teacherName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Subject:</td>
                  <td style="padding: 8px 0;">${body.subject}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;" />
              <p style="text-align: right; font-size: 24px; font-weight: bold; color: #006B3F; margin: 0;">
                GH₵${body.amount}
              </p>
            </div>
            
            <p style="color: #666; font-size: 12px;">Keep this receipt for your records.</p>
            <p>Best regards,<br/>The EDULINK Ghana Team</p>
          </div>
        </div>
      `;

      const emailResponse = await sendEmail(body.to, "Payment Receipt - EDULINK Ghana", html);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Email error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
