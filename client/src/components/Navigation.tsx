import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { 
  Home, 
  User, 
  Bike, 
  Map, 
  Shield, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: t('nav.home'), icon: Home, public: true },
    { href: '/profile', label: t('nav.profile'), icon: User, protected: true },
    { href: '/garage', label: t('nav.garage'), icon: Bike, protected: true },
    { href: '/passport', label: t('nav.passport'), icon: Map, protected: true },
  ];

  if (user?.role === 'admin' || user?.role === 'club_admin') {
    navLinks.push({ href: '/admin', label: t('nav.admin'), icon: Shield, protected: true });
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-lg">LE</span>
              </div>
              <span className="hidden sm:inline font-bold text-lg text-foreground">LEMC Coalition</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              if (link.protected && !isAuthenticated) return null;
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <a className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </a>
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            
            {isAuthenticated ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                asChild
                className="hidden md:inline-flex"
              >
                <a href={getLoginUrl()}>{t('nav.login')}</a>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => {
                if (link.protected && !isAuthenticated) return null;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <a 
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </a>
                  </Link>
                );
              })}
              
              {isAuthenticated ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start gap-3 px-3"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  asChild
                  className="w-full"
                >
                  <a href={getLoginUrl()}>{t('nav.login')}</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
