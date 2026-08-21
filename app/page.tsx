import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { Logo } from "@/components/Logo";

function Hero() {
  return (
    <section className="py-8 text-center">
      <Logo className="mx-auto h-20 w-20 drop-shadow-[0_0_25px_rgba(249,115,22,0.35)]" vibrate />
      <h1 className="mt-4 text-5xl font-black tracking-tight text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text sm:text-6xl">
        TEMAZO
      </h1>
      <p className="mx-auto mt-5 max-w-md text-lg text-neutral-300">
        Subí tu música. Escuchá la de los demás. Votá. Descubrí cuál es el{" "}
        <span className="font-semibold text-orange-300">TEMAZO</span> del
        grupo.
      </p>
    </section>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-8">
        <Hero />
        <section className="card">
          <LoginForm />
        </section>
        <p className="text-center text-sm text-neutral-500">
          Sin contraseñas ni correos: elegís un nombre y listo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Hero />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h3 className="mb-3 text-lg font-bold text-neutral-100">Crear un grupo</h3>
          <CreateGroupForm />
        </section>
        <section className="card">
          <h3 className="mb-3 text-lg font-bold text-neutral-100">Unirme a un grupo</h3>
          <JoinGroupForm />
        </section>
      </div>
    </div>
  );
}
