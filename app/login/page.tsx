import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-black text-neutral-100">Bienvenido a TEMAZO</h1>
        <p className="mt-2 text-neutral-400">
          Sin contraseñas: tu nombre es tu identidad en esta plataforma.
        </p>
      </section>
      <section className="card">
        <LoginForm />
      </section>
    </div>
  );
}
