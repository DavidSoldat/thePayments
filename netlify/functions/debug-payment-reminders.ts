// netlify/functions/debug-payment-reminders.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`🔍 Debug run at: ${now.toISOString()}`);
    console.log(
      `📅 Current day: ${currentDay}, Month: ${currentMonth}, Year: ${currentYear}`,
    );

    // Get ALL unpaid payments for debugging
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
      console.error("❌ Database query error:", error);
      throw error;
    }

    console.log(`📊 Found ${payments?.length || 0} unpaid payments total`);

    // Show all payments with calculated due dates
    const debugPayments =
      payments?.map((payment) => {
        const agreementDay = payment.agreement_day;
        const paymentDelay = payment.payment_delay || 0;

        const dueDate = new Date(currentYear, currentMonth - 1, agreementDay);
        dueDate.setDate(dueDate.getDate() + paymentDelay);

        const isDueToday =
          dueDate.getDate() === currentDay &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === currentYear;

        return {
          id: payment.id,
          company_name: payment.company_name,
          amount: payment.payment_amount,
          agreement_day: agreementDay,
          payment_delay: paymentDelay,
          calculated_due_date: dueDate.toISOString().split("T")[0],
          is_due_today: isDueToday,
          company_user_id: payment.companies?.user_id,
          has_receiving_date: payment.receiving_date !== null,
        };
      }) || [];

    const dueToday = debugPayments.filter((p) => p.is_due_today);

    console.log(`🎯 Payments due today: ${dueToday.length}`);

    // Get user emails
    const userEmails = {};
    if (dueToday.length > 0) {
      const userIds = [
        ...new Set(dueToday.map((p) => p.company_user_id).filter(Boolean)),
      ];
      console.log(`👥 Unique user IDs with due payments: ${userIds.length}`);

      const { data: users, error: usersError } =
        await supabase.auth.admin.listUsers();

      if (usersError) {
        console.error("❌ Error fetching users:", usersError);
      } else {
        console.log(`📧 Total users in auth: ${users.users.length}`);
        users.users.forEach((user) => {
          if (userIds.includes(user.id)) {
            userEmails[user.id] = user.email;
          }
        });
        console.log(
          `✅ Found emails for ${Object.keys(userEmails).length} users`,
        );
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(
        {
          success: true,
          debug_info: {
            current_date: now.toISOString(),
            current_day: currentDay,
            current_month: currentMonth,
            total_unpaid_payments: payments?.length || 0,
            payments_due_today: dueToday.length,
            user_emails_found: Object.keys(userEmails).length,
          },
          all_payments: debugPayments,
          due_today: dueToday,
          user_emails: userEmails,
          environment_check: {
            has_supabase_url: !!process.env.SUPABASE_URL,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            has_resend_key: !!process.env.RESEND_API_KEY,
            has_from_email: !!process.env.FROM_EMAIL,
          },
        },
        null,
        2,
      ),
    };
  } catch (error) {
    console.error("💥 Error in debug function:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(
        {
          success: false,
          error: error.message,
          stack: error.stack,
        },
        null,
        2,
      ),
    };
  }
};
