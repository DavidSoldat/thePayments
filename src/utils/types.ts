export interface Company {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  company_name: string;
  agreement_day: string | null;
  payment_delay: number | null;
  receiving_date: string | null;
  payment_amount: number | null;
  created_at: string;
  company_id: string;
}

export interface AuthResult {
  success: boolean;
  user?: unknown;
  company?: Company;
  error?: string;
}
