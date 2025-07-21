import { useEffect, useState } from "react";
import AddPaymentForm from "../components/AddPaymentForm";
import Nav from "../components/Nav";
import PaymentsTable from "../components/PaymentsTable";
import { getPayments } from "../supabase/actions";
import type { Payment } from "../utils/types";

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);

  // useEffect(() => {
  //   async function fetchPayments() {
  //     try {
  //       const result = await getPayments();
  //       if (result.success) {
  //         setPayments(result.payments || []);
  //       } else {
  //         console.error("Failed to fetch payments:", result.error);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching payments:", error);
  //     }
  //   }

  //   fetchPayments();
  // }, []);

  const fetchPayments = async () => {
    try {
      const result = await getPayments();
      if (result.success) {
        setPayments(result.payments || []);
      } else {
        console.error("Failed to fetch payments:", result.error);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePaymentAdded = async () => {
    await fetchPayments(); 
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Nav />
      <div className="mt-16 flex w-full flex-1 flex-col justify-center gap-5 px-3 md:flex-row md:p-10">
        <div className="order-2 h-fit md:order-1 md:w-[70%]">
          <PaymentsTable payments={payments} />
        </div>
        <div className="order-1 flex h-fit justify-center md:order-2 md:w-[30%]">
          <AddPaymentForm onPaymentAdded={handlePaymentAdded}/>
        </div>
      </div>
    </div>
  );
}
