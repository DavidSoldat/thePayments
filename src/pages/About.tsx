import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Nav from "../components/Nav";
import { useLogout } from "../hooks/UseLogout";
import { getCompanyProfile } from "../supabase/actions";
import { type Company } from "../utils/types";

export default function About() {
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const logout = useLogout();
  const handlelogout = () => {
    logout();
    toast.success("User logged out");
  };

  async function fetchCompanyInfo() {
    const response = await getCompanyProfile();
    setCompanyInfo(response);
  }

  useEffect(() => {
    fetchCompanyInfo();
  }, []);
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Nav />
      <div className="m-18 flex flex-1 flex-col items-center gap-5 bg-gray-100">
        <h1 className="text-xl font-semibold text-sky-700">About Company</h1>
        {companyInfo ? (
          <div className="mt-4">
            <p className="text-lg text-gray-700">
              Company name:{" "}
              <span className="font-semibold text-sky-800">
                {companyInfo.name}
              </span>
            </p>
            <p className="text-lg text-gray-700">
              Company id:{" "}
              <span className="font-semibold text-sky-800">
                {companyInfo.id}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Loading company information...
          </p>
        )}
        <button onClick={handlelogout} className="text-lg text-red-500">
          Logout
        </button>
      </div>
    </div>
  );
}
