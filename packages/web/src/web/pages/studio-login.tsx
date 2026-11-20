import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { setStudioToken } from "../lib/api";
import { useStudioLogin } from "../queries/studio";
import { errMsg } from "../lib/studio";

function StudioLoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useStudioLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { token } = await login.mutateAsync({ email: email.trim(), password });
      setStudioToken(token);
      navigate("/rafa");
    } catch (err) {
      setError(errMsg(err, "E-mail ou senha inválidos."));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-5 py-12 text-white">
      {/* Fundo grafite com brilho dourado discreto */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(201,162,75,0.14),transparent_55%),radial-gradient(circle_at_85%_100%,rgba(201,162,75,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />
      </div>

      <div className="relative w-full max-w-md">
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-white/45 transition-colors hover:text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
        </a>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 shadow-2xl shadow-black/60 backdrop-blur"
        >
          <img
            src="/images/logo-rafa-laser-nobg.png"
            alt="Rafa Laser"
            className="h-14 w-auto"
            loading="eager"
          />
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
            Rafa Laser <span className="text-[#C9A24B]">Studio</span>
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full border border-[#C9A24B]/35 bg-[#C9A24B]/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#E7CE8F]">
              BETA
            </span>
            <p className="text-sm text-white/45">Acesso restrito a convidados.</p>
          </div>

          <div className="mt-7 space-y-4">
            <div>
              <label className="text-xs font-semibold tracking-wide text-white/55 uppercase">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#C9A24B]/70"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide text-white/55 uppercase">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#C9A24B]/70"
                placeholder="••••••"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#E7CE8F] to-[#B8863B] px-4 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {login.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Entrar no Studio
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-white/35">
            Não há cadastro público. Peça um acesso ao proprietário.
          </p>
        </form>
      </div>
    </div>
  );
}

export default StudioLoginPage;
