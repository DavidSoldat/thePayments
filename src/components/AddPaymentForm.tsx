import { useState } from "react";
import { TextField, Button } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { addPayment } from "../supabase/actions";
import toast from "react-hot-toast";

export default function AddPaymentForm({
  onPaymentAdded,
}: {
  onPaymentAdded: () => void;
}) {
  const [company_name, setcompany_name] = useState<string>("");
  const [agreement_day, setagreement_day] = useState<Dayjs | null>(dayjs());
  const [payment_delay, setpayment_delay] = useState<string>("");
  const [payment_amount, setpayment_amount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const companyId = JSON.parse(localStorage.getItem("company") ?? "{}").id;

  const formattedagreement_day = agreement_day
    ? dayjs(agreement_day).format("YYYY-MM-DD")
    : "";

  const receiving_date =
    agreement_day && payment_delay
      ? dayjs(agreement_day)
          .add(parseInt(payment_delay) || 0, "day")
          .format("YYYY-MM-DD")
      : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !company_name.trim() ||
      !agreement_day ||
      !payment_delay ||
      !payment_amount
    ) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      await addPayment({
        company_name: company_name.trim(),
        agreement_day: formattedagreement_day,
        payment_delay: parseInt(payment_delay),
        receiving_date: receiving_date,
        payment_amount: parseFloat(payment_amount),
        company_id: companyId,
      });

      setcompany_name("");
      setagreement_day(dayjs());
      setpayment_delay("");
      setpayment_amount("");

      toast.success("Payment added successfully");
      onPaymentAdded();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to add payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit max-w-xs flex-col gap-3 border border-gray-100 bg-white p-8 drop-shadow-sm md:gap-5 lg:mt-0"
    >
      <TextField
        id="company-name"
        label="Company name"
        value={company_name}
        onChange={(e) => setcompany_name(e.target.value)}
        required
        disabled={isSubmitting}
      />

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Agreement day"
          value={agreement_day}
          onChange={(newDate) => setagreement_day(newDate)}
          disabled={isSubmitting}
        />
      </LocalizationProvider>

      <TextField
        id="payment-delay"
        label="Number of days"
        type="number"
        value={payment_delay}
        onChange={(e) => setpayment_delay(e.target.value)}
        required
        disabled={isSubmitting}
      />

      <TextField
        id="payment-amount"
        label="Payment amount (€)"
        type="number"
        value={payment_amount}
        onChange={(e) => setpayment_amount(e.target.value)}
        inputProps={{ min: 0, step: "0.01" }}
        required
        disabled={isSubmitting}
      />

      {receiving_date && (
        <div className="text-sm text-gray-600">
          <strong>Calculated receiving date:</strong>{" "}
          {dayjs(receiving_date).format("DD/MM/YYYY")}
        </div>
      )}

      <Button
        variant="contained"
        style={{ backgroundColor: "oklch(44.3% 0.11 240.79)" }}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adding..." : "Add Payment"}
      </Button>
    </form>
  );
}
