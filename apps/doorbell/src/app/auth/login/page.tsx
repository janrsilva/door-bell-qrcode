import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

function LoginFormWrapper() {
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginFormWrapper />
    </Suspense>
  );
}
