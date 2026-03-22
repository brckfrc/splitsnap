import { useNavigate } from 'react-router';
import { User, Mail, Bell, Moon, Sun, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { currentUser } from '../../lib/mockData';
import { useState, useEffect } from 'react';

export function ProfilePage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      localStorage.removeItem('splitsnap_user');
      navigate('/');
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h1 className="text-2xl">Profil</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* User Info */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
              {currentUser.avatar || '👤'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl mb-1">{currentUser.name}</h2>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <div>
          <h3 className="text-sm text-muted-foreground mb-3">Ayarlar</h3>
          <Card>
            <div className="space-y-4">
              {/* Edit Profile */}
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="size-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm">Profili Düzenle</div>
                  <div className="text-xs text-muted-foreground">Ad, fotoğraf ve daha fazlası</div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />

              {/* Notifications */}
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="size-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm">Bildirimler</div>
                  <div className="text-xs text-muted-foreground">Bildirim tercihlerini yönet</div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>

              <div className="border-t border-border" />

              {/* Dark Mode */}
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {darkMode ? (
                    <Moon className="size-5 text-primary" />
                  ) : (
                    <Sun className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm">Karanlık Mod</div>
                  <div className="text-xs text-muted-foreground">
                    {darkMode ? 'Açık' : 'Kapalı'}
                  </div>
                </div>
                <div
                  className={`w-12 h-7 rounded-full transition-colors ${
                    darkMode ? 'bg-primary' : 'bg-switch-background'
                  }`}
                >
                  <div
                    className={`size-5 bg-white rounded-full m-1 transition-transform ${
                      darkMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>
          </Card>
        </div>

        {/* About */}
        <div>
          <h3 className="text-sm text-muted-foreground mb-3">Hakkında</h3>
          <Card>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors">
                <span className="text-sm">Gizlilik Politikası</span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
              
              <div className="border-t border-border" />
              
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors">
                <span className="text-sm">Kullanım Koşulları</span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
              
              <div className="border-t border-border" />
              
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors">
                <span className="text-sm">Destek</span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        </div>

        {/* App Info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">SplitSnap v1.0.0</p>
          <p className="text-xs text-muted-foreground">Made with ❤️ for easy expense sharing</p>
        </div>

        {/* Logout */}
        <Card
          onClick={handleLogout}
          className="cursor-pointer bg-destructive/5 border-destructive/20"
        >
          <div className="text-center text-destructive py-2">
            Çıkış Yap
          </div>
        </Card>
      </div>
    </div>
  );
}
