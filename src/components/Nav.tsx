import { Link } from "react-router-dom";

export default function Nav() {
  const company = localStorage.getItem("company");
  const companyName = company ? JSON.parse(company).name : "Company";
  return (
    <nav className="w-full bg-gray-100 px-4 py-6 drop-shadow-md md:px-5 md:py-10">
      <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start"></div>

        <div className="flex items-center justify-center">
          <Link
            to="/dashboard"
            className="text-center text-xl font-bold text-sky-800 drop-shadow-sm sm:text-2xl md:text-3xl"
          >
            The Payments
          </Link>
        </div>

        <div className="flex items-center justify-end">
          <Link
            to="/about"
            className="text-right text-sm font-normal text-sky-700 sm:text-base md:text-xl"
          >
            <span className="hidden sm:inline">{companyName}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
