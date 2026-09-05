import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { Layout } from '@/components/layout';
import { LoginPage } from '@/pages/login';
import { SignupPage } from '@/pages/signup';
import { DashboardPage } from '@/pages/dashboard';
import { BattlePage } from '@/pages/battle';
import { ProfilePage } from '@/pages/profile';
import { LeaderboardPage } from '@/pages/leaderboard';
import { LobbyPage } from '@/pages/lobby';
import { ResultsPage } from '@/pages/results';
import { DailyChallengePage } from '@/pages/daily-challenge';
import { AdminPage } from '@/pages/admin';
import { LandingPage } from '@/pages/landing';
import { ErrorBoundary } from '@/components/error-boundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isInitialized } = useAuthStore();

  if (isLoading || (!isInitialized && isAuthenticated)) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
};

export const App = () => {
  const { refresh, isInitialized, isAuthenticated, accessToken, fetchCurrentUser, setInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      if (isAuthenticated) {
        if (accessToken) {
          setInitialized(true);
          fetchCurrentUser().catch(() => {});
        } else {
          refresh();
        }
      } else {
        setInitialized(true);
      }
    }
  }, [refresh, isInitialized, isAuthenticated, accessToken, fetchCurrentUser, setInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Root index route: Landing page for visitors, Dashboard for logged-in operators */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                ) : (
                  <LandingPage />
                )
              }
            >
              {isAuthenticated && <Route index element={<DashboardPage />} />}
            </Route>

            {/* Authenticated Inner Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="profile" element={<ProfilePage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="daily-challenge" element={<DailyChallengePage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="lobby/:roomId" element={<LobbyPage />} />
              <Route path="battle/:roomId" element={<BattlePage />} />
              <Route path="battle/multi-round/:roomId" element={<BattlePage />} />
              <Route path="battle/quickode/:roomId" element={<BattlePage />} />
              <Route path="battle/chaos-arena/:roomId" element={<BattlePage />} />
              <Route path="results/:roomId" element={<ResultsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};
