import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, Loader2 } from "lucide-react";
import { client, setAdminToken } from "../lib/api";

function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await client.admin.login({
        username: username.trim(),
        password,
      });
      setAdminToken(token);
      navigate("/admin");
    } catch {
      setError("Usuário ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-3xl border border-border bg-card p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
          <Lock className="h-6 w-6 text-gold-deep" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Painel do administrador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso restrito. Entre com seu usuário e senha.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Usuário</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default AdminLoginPage;
