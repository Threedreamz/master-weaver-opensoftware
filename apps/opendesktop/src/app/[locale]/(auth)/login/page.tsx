import { useTranslations } from "next-intl";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
              <span className="text-white text-lg font-bold">OD</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("loginTitle")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t("loginDescription")}</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
