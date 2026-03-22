import { Outlet, useLocation, useNavigate } from 'react-router';
import { Home, User, LogOut } from 'lucide-react';
import { useEffect } from 'react';

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if user is authenticated (mock - checking localStorage)
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('splitsnap_user');
    const publicPaths = ['/', '/register'];
    
    if (!isAuthenticated && !publicPaths.includes(location.pathname)) {
      navigate('/');
    }
  }, [location.pathname, navigate]);

  const showBottomNav = !['/', '/register'].includes(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem('splitsnap_user');
    navigate('/');
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* iOS-style status bar space */}
      <div className="h-11 bg-background" />
      
      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* iOS-style bottom navigation */}
      {showBottomNav && (
        <div className="border-t border-border bg-card">
          <div className="flex items-center justify-around h-20 max-w-md mx-auto px-4 pb-6">
            <button
              onClick={() => navigate('/groups')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                location.pathname.includes('/groups')
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Home className="size-6" />
              <span className="text-xs">Gruplar</span>
            </button>
            
            <button
              onClick={() => navigate('/profile')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                location.pathname === '/profile'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <User className="size-6" />
              <span className="text-xs">Profil</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-destructive transition-colors"
            >
              <LogOut className="size-6" />
              <span className="text-xs">Çıkış</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
