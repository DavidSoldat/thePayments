import type { AuthResult, Company, Payment } from "../utils/types";
import supabase from "./supabase";

export async function signUpCompany(
  email: string,
  password: string,
  companyName: string,
): Promise<AuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "User creation failed" };
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        user_id: authData.user.id,
        name: companyName,
      })
      .select()
      .single();

    if (companyError) {
      return { success: false, error: companyError.message };
    }

    return {
      success: true,
      user: authData.user,
      company: company as Company,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function loginCompany(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Login failed" };
    }

    const company = await getCompanyProfile();

    if (!company) {
      return { success: false, error: "Company profile not found" };
    }

    return {
      success: true,
      user: authData.user,
      company,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function logoutCompany(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getCompanyProfile(): Promise<Company | null> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching company profile:", error);
      return null;
    }

    return data as Company;
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return null;
  }
}

export async function getPayments(): Promise<{
  success: boolean;
  payments?: Payment[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, payments: data as Payment[] };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function addPayment(
  payment: Omit<Payment, "id" | "user_id" | "created_at">,
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        ...payment,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, payment: data as Payment };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updatePayment(
  paymentId: string,
  updates: Partial<Omit<Payment, "id" | "user_id" | "created_at">>,
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .update(updates)
      .eq("id", paymentId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, payment: data as Payment };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deletePayment(
  paymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deletePayments(
  paymentIds: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .in("id", paymentIds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function subscribeToAuthChanges(callback: (user: unknown) => void) {
  return supabase.auth.onAuthStateChange((_, session) => {
    callback(session?.user || null);
  });
}

export async function subscribeToPayments(
  callback: (payload: unknown) => void,
) {
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    throw new Error("User not authenticated");
  }

  return supabase
    .channel("payments")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
        filter: `user_id=eq.${user.data.user.id}`,
      },
      callback,
    )
    .subscribe();
}
