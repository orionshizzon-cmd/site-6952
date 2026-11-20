import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Coins, LayoutGrid, LogOut, MessageSquarePlus, Shield, Sparkles } from "lucide-react";
import { getStudioToken, setStudioToken } from "../lib/api";
import { useStudioMe } from "../queries/studio";

/** Aviso fixo da versão beta. */
export function BetaNotice() {
  return (
    <p className="rounded-2xl border border-[#C9A24B]/25 bg-[#C9A24B]/[0.07] px-4 py-3 text-sm text-[#E7CE8F]">
      Versão Beta — envie sugestões para ajudar a melhorar o Rafa Laser Studio.
    </p>
  );
}

/** Cartão escuro padrão do Studio. */
export function StudioCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

const NAV = [
  { href: "/rafa", label: "Painel", icon: LayoutGrid },
  { href: "/rafa/projetos", label: "Meus Projetos", icon: Sparkles },
  { href: "/rafa/feedback", label: "Feedback", icon: MessageSquarePlus },
];

/**
 * Moldura de todas as telas internas do Studio: fundo escuro, cabeçalho com
 * créditos e guarda de sessão (sem token válido volta para o login).
 */
export function StudioShell({
  children,
  requireOwner = false,
}: {
  children: ReactNode;
  requireOwner?: boolean;
}) {
  const [location, navigate] = useLocation();
  const hasToken = Boolean(getStudioToken());
  const me = useStudioMe(hasToken);

  useEffect(() => {
    if (!hasToken) navigate("/rafa/login", { replace: true });
  }, [hasToken, navigate]);

  useEffect(() => {
    if (me.isError) {
      setStudioToken(null);
      navigate("/rafa/login", { replace: true });
    }
  }, [me.isError, navigate]);

  function logout() {
    setStudioToken(null);
    navigate("/rafa/login", { replace: true });
  }

  const user = me.data;
  const isOwner = user?.role === "owner";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(201,162,75,0.12),transparent_55%)]" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-black/45 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/rafa" className="flex items-center gap-2.5">
            <img
              src="/images/logo-rafa-laser-nobg.png"
              alt="Rafa Laser"
              className="h-8 w-auto"
            />
            <span className="font-display text-sm font-bold tracking-tight">
              Studio
              <span className="ml-1.5 rounded-full border border-[#C9A24B]/35 bg-[#C9A24B]/10 px-1.5 py-0.5 align-middle text-[9px] font-bold text-[#E7CE8F]">
                BETA
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold">
              <Coins className="h-3.5 w-3.5 text-[#E7CE8F]" />
              {isOwner ? "Ilimitado" : `${user?.credits ?? 0} créditos`}
            </span>
            <span className="hidden text-xs text-white/45 sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              aria-label="Sair"
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          <nav className="-mx-1 flex w-full items-center gap-1 overflow-x-auto pb-0.5">
            {NAV.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[#C9A24B] text-black"
                      : "text-white/55 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
            {isOwner && (
              <Link
                href="/rafa/proprietario"
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  location === "/rafa/proprietario"
                    ? "bg-[#C9A24B] text-black"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Proprietário
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {me.isLoading && <p className="text-sm text-white/45">Carregando…</p>}
        {user && requireOwner && !isOwner && (
          <StudioCard>
            <p className="text-sm text-white/70">
              Esta área é exclusiva do proprietário.
            </p>
          </StudioCard>
        )}
        {user && (!requireOwner || isOwner) && children}
      </main>
    </div>
  );
}
