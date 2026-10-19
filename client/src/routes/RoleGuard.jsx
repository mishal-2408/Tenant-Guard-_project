import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import AccessDenied from '../pages/errors/AccessDenied.jsx';

export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDenied requiredRoles={allowedRoles} userRole={user?.role} />;
  }

  return children;
};

export default RoleGuard;
