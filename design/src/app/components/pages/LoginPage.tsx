import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { currentUser } from "../../lib/mockData";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication - just save user to localStorage
    localStorage.setItem(
      "splitsnap_user",
      JSON.stringify(currentUser),
    );
    navigate("/groups");
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-3">
          <div className="text-6xl mb-4"></div>
          <h1 className="text-3xl tracking-tight">SplitSnap</h1>
          <p className="text-muted-foreground">
            Ortak harcamalarınızı kolayca takip edin
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="E-posta"
            type="email"
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Şifre"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" size="lg">
            Giriş Yap
          </Button>
        </form>

        {/* Register Link */}
        <div className="text-center">
          <span className="text-muted-foreground">
            Hesabınız yok mu?{" "}
          </span>
          <Link to="/register" className="text-primary">
            Kayıt Olun
          </Link>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 p-4 bg-accent/50 rounded-xl border border-border">
          <p className="text-xs text-center text-muted-foreground">
            Demo sürümü - Herhangi bir e-posta ve şifre ile
            giriş yapabilirsiniz
          </p>
        </div>
      </div>
    </div>
  );
}