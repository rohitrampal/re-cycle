import React, { Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { authApi } from "@/lib/api/endpoints";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

const HomePage = React.lazy(() => import("./pages/Home"));
const LoginPage = React.lazy(() => import("./pages/Login"));
const RegisterPage = React.lazy(() => import("./pages/Register"));
const BrowsePage = React.lazy(() => import("./pages/Browse"));
const CreateListingPage = React.lazy(() => import("./pages/CreateListing"));
const ListingDetailPage = React.lazy(() => import("./pages/ListingDetail"));
const ProfilePage = React.lazy(() => import("./pages/Profile"));

function App() {
  const { i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token && !isAuthenticated) {
        try {
          const response = await authApi.me();
          if (response.data) {
            // Store will be updated by login/register flows when needed
          }
        } catch {
          logout();
        }
      }
    };
    checkAuth();
  }, [isAuthenticated, logout]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<PageLoader />}>
                <RegisterPage />
              </Suspense>
            }
          />
          <Route
            path="/browse"
            element={
              <Suspense fallback={<PageLoader />}>
                <BrowsePage />
              </Suspense>
            }
          />
          <Route
            path="/listing/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <ListingDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/create"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <CreateListingPage />
                </Suspense>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <ProfilePage />
                </Suspense>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
