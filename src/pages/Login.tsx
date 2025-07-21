import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type z from "zod";
import { loginSchema } from "../utils/zodSchemas";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { loginCompany } from "../supabase/actions";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function onSubmit(data: FormData) {
    const { email, password } = data;

    setIsLoading(true);
    setLoginError(null);

    try {
      console.log("Attempting login with:", { email });
      const result = await loginCompany(email, password);

      if (result.success) {
        console.log("Login successful:", result.company);
        console.log("User:", result.user);

        localStorage.setItem("company", JSON.stringify(result.company));

        navigate("/dashboard");
      } else {
        console.error("Login failed:", result.error);
        setLoginError(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  type FormData = z.infer<typeof loginSchema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center bg-white p-10">
        <h2 className="text-xl font-medium text-sky-800">
          Login to <span className="bg-sky-100/30 p-1.5">The Payments</span>
        </h2>

        {loginError && (
          <div className="mt-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {loginError}
          </div>
        )}
        <form
          className="mt-10 flex w-full flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <label htmlFor="email">Email</label>
              <input
                {...register("email")}
                type="email"
                autoFocus={true}
                id="email"
                placeholder="Enter email"
                autoComplete="email"
                disabled={isLoading}
                className={`rounded-13 flex-1 border px-3 py-1 ${errors.email ? "border-red-500 text-sm" : ""} ${isLoading ? "bg-gray-100" : ""}`}
              />
            </div>
            {errors.email && (
              <span className="self-end text-xs text-red-500">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <label htmlFor="password">Password</label>
              <input
                {...register("password")}
                type="password"
                id="password"
                placeholder="Enter password"
                disabled={isLoading}
                className={`rounded-13 border px-3 py-1 ${errors.password ? "border-red-500" : ""} ${isLoading ? "bg-gray-100" : ""}`}
                autoComplete="current-password"
              />
            </div>
            {errors.password && (
              <span className="self-end text-xs text-red-500">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mx-auto mt-5 w-full cursor-pointer bg-sky-800 px-4 py-2 text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
