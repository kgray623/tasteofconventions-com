import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-display tracking-tight">A Taste</span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline">
            of Special Conventions
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link to="/restaurants" className="px-3 py-2 rounded-md hover:bg-secondary transition">
            Restaurants
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-secondary transition">
                Dashboard
              </Link>
              <Link to="/admin" className="px-3 py-2 rounded-md hover:bg-secondary transition">
                Admin
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-ink text-cream hover:bg-ink/90">Sign in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
