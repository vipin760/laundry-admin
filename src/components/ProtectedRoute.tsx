import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional UX-only gate for surfaces that should only be reachable by a
   * given role (e.g. 'admin'). This is defense-in-depth, not the security
   * boundary — the backend already hard-enforces @Roles() on every
   * privileged endpoint regardless of what the frontend renders.
   */
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();
  const hasToken = Boolean(localStorage.getItem('authToken'));

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
