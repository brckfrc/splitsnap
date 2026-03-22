import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { currentUser } from '../../lib/mockData';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock registration - just save user to localStorage
    localStorage.setItem('splitsnap_user', JSON.stringify(currentUser));
    navigate('/groups');
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-3">
          <div className="text-6xl mb-4">💸</div>
          <h1 className="text-3xl tracking-tight">Hesap Oluştur</h1>
          <p className="text-muted-foreground">
            SplitSnap'e hoş geldiniz
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Ad Soyad"
            type="text"
            placeholder="Ahmet Yılmaz"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            Kayıt Ol
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center">
          <span className="text-muted-foreground">Zaten hesabınız var mı? </span>
          <Link to="/" className="text-primary">
            Giriş Yapın
          </Link>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 p-4 bg-accent/50 rounded-xl border border-border">
          <p className="text-xs text-center text-muted-foreground">
            Demo sürümü - Bilgileriniz kaydedilmeyecektir
          </p>
        </div>
      </div>
    </div>
  );
}
