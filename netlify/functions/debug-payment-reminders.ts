// // netlify/functions/debug-payment-reminders.ts
// import { Handler } from "@netlify/functions";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// export const handler: Handler = async (event, context) => {
//   const headers = {
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Headers": "Content-Type",
//     "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//   };

//   if (event.httpMethod === "OPTIONS") {
//     return { statusCode: 200, headers, body: "" };
//   }

//   try {
//     const now = new Date();
//     const currentDay = now.getDate();
//     const currentMonth = now.getMonth() + 1;
//     const currentYear = now.getFullYear();

//     console.log(`🔍 Debug run at: ${now.toISOString()}`);
//     console.log(
//       `📅 Current day: ${currentDay}, Month: ${currentMonth}, Year: ${currentYear}`,
//     );

//     // Get ALL unpaid payments for debugging
//     const { data: payments, error } = await supabase
//       .from("payments")
//       .select(
//         `
//         *,
//         companies (
//           name,
//           user_id
//         )
//       `,
//       )
//       .is("receiving_date", null);

//     if (error) {
//       console.error("❌ Database query error:", error);
//       throw error;
//     }

//     console.log(`📊 Found ${payments?.length || 0} unpaid payments total`);

//     // Show all payments with calculated due dates
//     const debugPayments =
//       payments?.map((payment) => {
//         const agreementDay = payment.agreement_day;
//         const paymentDelay = payment.payment_delay || 0;

//         const dueDate = new Date(currentYear, currentMonth - 1, agreementDay);
//         dueDate.setDate(dueDate.getDate() + paymentDelay);

//         const isDueToday =
//           dueDate.getDate() === currentDay &&
//           dueDate.getMonth() === now.getMonth() &&
//           dueDate.getFullYear() === currentYear;

//         return {
//           id: payment.id,
//           company_name: payment.company_name,
//           amount: payment.payment_amount,
//           agreement_day: agreementDay,
//           payment_delay: paymentDelay,
//           calculated_due_date: dueDate.toISOString().split("T")[0],
//           is_due_today: isDueToday,
//           company_user_id: payment.companies?.user_id,
//           has_receiving_date: payment.receiving_date !== null,
//         };
//       }) || [];

//     const dueToday = debugPayments.filter((p) => p.is_due_today);

//     console.log(`🎯 Payments due today: ${dueToday.length}`);

//     // Get user emails
//     const userEmails = {};
//     if (dueToday.length > 0) {
//       const userIds = [
//         ...new Set(dueToday.map((p) => p.company_user_id).filter(Boolean)),
//       ];
//       console.log(`👥 Unique user IDs with due payments: ${userIds.length}`);

//       const { data: users, error: usersError } =
//         await supabase.auth.admin.listUsers();

//       if (usersError) {
//         console.error("❌ Error fetching users:", usersError);
//       } else {
//         console.log(`📧 Total users in auth: ${users.users.length}`);
//         users.users.forEach((user) => {
//           if (userIds.includes(user.id)) {
//             userEmails[user.id] = user.email;
//           }
//         });
//         console.log(
//           `✅ Found emails for ${Object.keys(userEmails).length} users`,
//         );
//       }
//     }

//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify(
//         {
//           success: true,
//           debug_info: {
//             current_date: now.toISOString(),
//             current_day: currentDay,
//             current_month: currentMonth,
//             total_unpaid_payments: payments?.length || 0,
//             payments_due_today: dueToday.length,
//             user_emails_found: Object.keys(userEmails).length,
//           },
//           all_payments: debugPayments,
//           due_today: dueToday,
//           user_emails: userEmails,
//           environment_check: {
//             has_supabase_url: !!process.env.SUPABASE_URL,
//             has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
//             has_resend_key: !!process.env.RESEND_API_KEY,
//             has_from_email: !!process.env.FROM_EMAIL,
//           },
//         },
//         null,
//         2,
//       ),
//     };
//   } catch (error) {
//     console.error("💥 Error in debug function:", error);

//     return {
//       statusCode: 500,
//       headers,
//       body: JSON.stringify(
//         {
//           success: false,
//           error: error.message,
//           stack: error.stack,
//         },
//         null,
//         2,
//       ),
//     };
//   }
// };

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Define a type for the payment data, including the joined company data
// This improves type safety and readability
type PaymentWithCompany = {
  id: string;
  user_id: string;
  company_name: string;
  agreement_day: string; // Assuming DATE comes as string 'YYYY-MM-DD'
  payment_delay: number;
  receiving_date: string; // Assuming DATE comes as string 'YYYY-MM-DD'
  payment_amount: number;
  created_at: string;
  companies: {
    name: string;
    user_id: string;
  } | null; // companies can be null if join fails or no related company
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Adjust this for production to your specific frontend URL
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const now = new Date();
    // Get today's date in 'YYYY-MM-DD' format for database comparison
    const todayISO = now.toISOString().split("T")[0]; // e.g., "2025-07-29"

    // Extract day, month, year for the `agreement_day` based calculation
    const currentDay = now.getDate();
    const currentMonth = now.getMonth(); // 0-indexed for Date constructor
    const currentYear = now.getFullYear();

    console.log(`🔍 Debug run at: ${now.toISOString()}`);
    console.log(`📅 Current date (ISO): ${todayISO}`);
    console.log(
      `📅 Current day for calculation: ${currentDay}, Month: ${currentMonth + 1}, Year: ${currentYear}`,
    );

    // --- FETCH ALL RELEVANT UNPAID PAYMENTS ---
    // Fetch payments where receiving_date is today or in the future.
    // This assumes 'receiving_date' is the authoritative due date.
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
      .gte("receiving_date", todayISO); // Changed from .is("receiving_date", null)

    if (error) {
      console.error("❌ Database query error:", error);
      throw error;
    }

    const fetchedPayments: PaymentWithCompany[] = payments || [];
    console.log(
      `📊 Found ${fetchedPayments.length} payments due today or in future`,
    );

    // --- PROCESS AND DEBUG EACH PAYMENT ---
    const debugPayments =
      fetchedPayments.map((payment) => {
        // Parse agreement_day to get the day of the month
        const agreementDayNum = new Date(payment.agreement_day).getDate();
        const paymentDelay = payment.payment_delay || 0;

        // Calculate due date based on agreement_day and payment_delay (your original logic)
        // Note: This calculation can be tricky with month rollovers if agreement_day is late in month
        const calculatedDueDateObj = new Date(
          currentYear,
          currentMonth,
          agreementDayNum,
        );
        calculatedDueDateObj.setDate(
          calculatedDueDateObj.getDate() + paymentDelay,
        );
        const calculatedDueDateISO = calculatedDueDateObj
          .toISOString()
          .split("T")[0];

        // Determine if due today based on the actual receiving_date from the DB
        const isDueTodayActual = payment.receiving_date === todayISO;

        // Determine if due today based on the calculated date (for debugging comparison)
        const isDueTodayCalculated = calculatedDueDateISO === todayISO;

        return {
          id: payment.id,
          company_name: payment.company_name,
          amount: payment.payment_amount,
          agreement_day_db: payment.agreement_day, // The full date string from DB
          agreement_day_num_for_calc: agreementDayNum, // Just the day number
          payment_delay: paymentDelay,
          actual_receiving_date: payment.receiving_date, // The authoritative due date
          is_due_today_actual: isDueTodayActual,
          calculated_due_date: calculatedDueDateISO, // Due date derived from agreement_day + delay
          is_due_today_calculated: isDueTodayCalculated,
          company_user_id: payment.companies?.user_id,
        };
      }) || [];

    // Filter payments that are actually due today based on `receiving_date`
    const dueTodayActual = debugPayments.filter((p) => p.is_due_today_actual);
    // Filter payments that would be due today based on the `agreement_day` calculation
    const dueTodayCalculated = debugPayments.filter(
      (p) => p.is_due_today_calculated,
    );

    console.log(
      `🎯 Payments due today (based on receiving_date): ${dueTodayActual.length}`,
    );
    console.log(
      `🤔 Payments due today (based on agreement_day calculation): ${dueTodayCalculated.length}`,
    );

    // --- FETCH USER EMAILS FOR PAYMENTS ACTUALLY DUE TODAY ---
    const userEmails: { [key: string]: string | undefined } = {};
    if (dueTodayActual.length > 0) {
      const userIds = [
        ...new Set(
          dueTodayActual.map((p) => p.company_user_id).filter(Boolean),
        ),
      ];
      console.log(
        `👥 Unique user IDs with actual due payments: ${userIds.length}`,
      );

      const { data: users, error: usersError } =
        await supabase.auth.admin.listUsers();

      if (usersError) {
        console.error("❌ Error fetching users:", usersError);
      } else {
        console.log(`📧 Total users in auth: ${users.users.length}`);
        users.users.forEach((user) => {
          if (userIds.includes(user.id) && user.email) {
            userEmails[user.id] = user.email;
          }
        });
        console.log(
          `✅ Found emails for ${Object.keys(userEmails).length} users`,
        );
      }
    }

    // --- RETURN DEBUG INFORMATION ---
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(
        {
          success: true,
          debug_info: {
            run_timestamp: now.toISOString(),
            current_date_iso: todayISO,
            total_payments_fetched: fetchedPayments.length,
            payments_due_today_actual: dueTodayActual.length,
            payments_due_today_calculated: dueTodayCalculated.length,
            user_emails_found: Object.keys(userEmails).length,
          },
          // Provide both sets of payments for comparison
          all_fetched_payments_with_debug_info: debugPayments,
          payments_actually_due_today: dueTodayActual,
          payments_calculated_due_today: dueTodayCalculated,
          user_emails_map: userEmails,
          environment_check: {
            has_supabase_url: !!process.env.SUPABASE_URL,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            has_resend_key: !!process.env.RESEND_API_KEY, // Check for Resend key even if not used in debug
            has_from_email: !!process.env.FROM_EMAIL, // Check for FROM_EMAIL even if not used in debug
          },
        },
        null,
        2, // space for pretty printing
      ),
    };
  } catch (error: any) {
    console.error("💥 Error in debug function:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(
        {
          success: false,
          error: error.message || "An unexpected error occurred",
          stack: error.stack,
        },
        null,
        2,
      ),
    };
  }
};
