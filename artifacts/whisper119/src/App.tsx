import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { CartProvider } from '@/components/cart-provider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { NewsletterModal } from '@/components/layout/NewsletterModal';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Shop from '@/pages/Shop';
import BookDetail from '@/pages/BookDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Order from '@/pages/Order';
import Account from '@/pages/Account';
import Admin, { AdminLogin } from '@/pages/Admin';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider } from '@/components/auth-provider';
import { PageViewTracker } from '@/components/page-view-tracker';

const queryClient = new QueryClient();

type ErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Whisper 119 render error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-center text-foreground">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Whisper 119</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">This shelf needs a refresh.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The storefront hit an unexpected display error. Refresh the page to load the catalogue again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
            >
              Refresh storefront
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

class AdminErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Whisper 119 admin panel error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-center text-foreground">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Librarian desk</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Something went wrong.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The admin panel hit an unexpected error. Check the browser console for details, then reload to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
            >
              Reload admin panel
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/shop" component={Shop} />
      <Route path="/book/:bookId" component={BookDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order/:orderId" component={Order} />
      <Route path="/account" component={Account} />
      <Route path="/admin/login">
        <AdminErrorBoundary>
          <AdminLogin />
        </AdminErrorBoundary>
      </Route>
      <Route path="/admin">
        <AdminErrorBoundary>
          <Admin />
        </AdminErrorBoundary>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider defaultTheme="dark">
            <AuthProvider>
              <CartProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                  <AppShell />
                </WouterRouter>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  return (
    <>
      {!isAdmin && <PageViewTracker />}
      {!isAdmin && <Navbar />}
      <Router />
      {!isAdmin && <Footer />}
      {!isAdmin && location === "/" && <NewsletterModal />}
    </>
  );
}

export default App;
