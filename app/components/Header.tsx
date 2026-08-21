import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/actions/users";
import { Logo } from "./Logo";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text">
            TEMAZO
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {user && (
            <Link
              href="/groups"
              className="text-sm font-semibold text-neutral-300 transition hover:text-orange-300"
            >
              📁 Mis grupos
            </Link>
          )}
          <Link
            href="/ranking"
            className="text-sm font-semibold text-neutral-300 transition hover:text-orange-300"
          >
            🏆 Ranking
          </Link>
          <Link
            href="/resenas"
            className="text-sm font-semibold text-neutral-300 transition hover:text-orange-300"
          >
            📝 Reseñas
          </Link>
          {user && (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-neutral-200">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                {user.name}
              </span>
              <form action={logout}>
                <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-300">
                  Salir
                </button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
