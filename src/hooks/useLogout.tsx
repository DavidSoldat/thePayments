import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabase";

export function useLogout() {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
      }

      localStorage.removeItem("company");

      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return logout;
}
