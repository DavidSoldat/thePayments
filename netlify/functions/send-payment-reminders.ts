/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

type EmailResult = {
  userId: string;
  email: string;
  paymentCount: number;
  success: boolean;
  result?: any;
  error?: string;
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`Checking for payments due on ${now.toDateString()}`);

    const { data: payments, error } = await supabase
      .from("payments")
      .select(
        `
        *,
        companies (
          name,
          user_id
        )
      `,
      )
      .is("receiving_date", null); 

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    console.log(`Found ${payments?.length || 0} unpaid payments total`);

    const duePayments =
      payments?.filter((payment) => {
        const agreementDay = payment.agreement_day;
        const paymentDelay = payment.payment_delay || 0;

        const dueDate = new Date(currentYear, currentMonth - 1, agreementDay);

        dueDate.setDate(dueDate.getDate() + paymentDelay);

        const isDueToday =
          dueDate.getDate() === currentDay &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === currentYear;

        if (isDueToday) {
          console.log(
            `Payment due today: ${payment.companies?.name} - $${payment.payment_amount}`,
          );
        }

        return isDueToday;
      }) || [];

    console.log(`Found ${duePayments.length} payments due today`);

    if (duePayments.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "No payments due today",
          count: 0,
        }),
      };
    }

    const userIds = [
      ...new Set(duePayments.map((p) => p.companies?.user_id).filter(Boolean)),
    ];

    const { data: users, error: usersError } =
      await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching user emails:", usersError);
      throw usersError;
    }

    const userEmailMap = new Map();
    users.users.forEach((user) => {
      if (userIds.includes(user.id)) {
        userEmailMap.set(user.id, user.email);
      }
    });

    console.log(`Found emails for ${userEmailMap.size} users`);

    const emailResults: EmailResult[] = [];

    const paymentsByUser = new Map();

    duePayments.forEach((payment) => {
      const userId = payment.companies?.user_id;
      if (userId && userEmailMap.has(userId)) {
        if (!paymentsByUser.has(userId)) {
          paymentsByUser.set(userId, []);
        }
        paymentsByUser.get(userId).push(payment);
      }
    });

    for (const [userId, userPayments] of paymentsByUser) {
      const userEmail = userEmailMap.get(userId);

      try {
        const result = await sendPaymentReminderEmail(userEmail, userPayments);
        emailResults.push({
          userId,
          email: userEmail,
          paymentCount: userPayments.length,
          success: true,
          result,
        });
        console.log(
          `✅ Email sent to ${userEmail} for ${userPayments.length} due payments`,
        );
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${userEmail}:`, emailError);
        emailResults.push({
          userId,
          email: userEmail,
          paymentCount: userPayments.length,
          success: false,
          error: emailError.message,
        });
      }
    }

    const successfulEmails = emailResults.filter((r) => r.success).length;
    const failedEmails = emailResults.filter((r) => !r.success).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Processed ${duePayments.length} due payments for ${paymentsByUser.size} users`,
        emailsSent: successfulEmails,
        emailsFailed: failedEmails,
        results: emailResults,
      }),
    };
  } catch (error) {
    console.error("Error in send-payment-reminders function:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

async function sendPaymentReminderEmail(userEmail: string, payments: any[]) {
  const now = new Date();
  const totalAmount = payments.reduce((sum, p) => sum + p.payment_amount, 0);

  const paymentDetailsHtml = payments
    .map((payment) => {
      const agreementDay = payment.agreement_day;
      const paymentDelay = payment.payment_delay || 0;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), agreementDay);
      dueDate.setDate(dueDate.getDate() + paymentDelay);

      return `
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #fafafa;">
        <div style="font-weight: bold; font-size: 18px; color: #2c3e50; margin-bottom: 5px;">
          ${payment.companies?.name || "Unknown Company"}
        </div>
        <div style="font-size: 24px; font-weight: bold; color: #dc3545; margin-bottom: 10px;">
          $${payment.payment_amount.toFixed(2)}
        </div>
        <div style="color: #666; font-size: 14px;">
          <div><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</div>
          <div><strong>Agreement Day:</strong> ${agreementDay}${getOrdinalSuffix(agreementDay)} of each month</div>
          ${paymentDelay > 0 ? `<div><strong>Payment Delay:</strong> ${paymentDelay} days</div>` : ""}
        </div>
      </div>
    `;
    })
    .join("");

  const emailData = {
    from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
    to: userEmail,
    subject: `💰 ${payments.length > 1 ? `${payments.length} Payments` : "Payment"} Due Today - $${totalAmount.toFixed(2)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
          }
          .content {
            padding: 30px 20px;
          }
          .summary {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            text-align: center;
          }
          .total-amount {
            font-size: 32px;
            font-weight: bold;
            color: #dc3545;
            margin: 10px 0;
          }
          .payment-count {
            color: #666;
            font-size: 16px;
          }
          .payments-section h2 {
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
          }
          .footer { 
            background: #f8f9fa;
            padding: 20px; 
            text-align: center;
            font-size: 14px; 
            color: #666;
            border-top: 1px solid #eee;
          }
          @media (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content { padding: 20px 15px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Payment${payments.length > 1 ? "s" : ""} Due Today</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
              You have ${payments.length} payment${payments.length > 1 ? "s" : ""} due today
            </p>
          </div>
          
          <div class="content">
            <div class="summary">
              <div class="total-amount">$${totalAmount.toFixed(2)}</div>
              <div class="payment-count">
                Total amount due from ${payments.length} payment${payments.length > 1 ? "s" : ""}
              </div>
            </div>
            
            <div class="payments-section">
              <h2>Payment Details</h2>
              ${paymentDetailsHtml}
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Important:</strong> This is an automated reminder from your payment tracking system.</p>
            <p>Please ensure these payments are processed today to avoid any delays.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
              Sent on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Email service error: ${response.status} - ${errorData}`);
  }

  return await response.json();
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
