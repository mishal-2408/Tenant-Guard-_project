import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';

// Pages
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import AcceptInvitation from '../pages/auth/AcceptInvitation.jsx';
import Dashboard from '../pages/dashboard/Dashboard.jsx';
import Projects from '../pages/projects/Projects.jsx';
import Tasks from '../pages/tasks/Tasks.jsx';
import Team from '../pages/team/Team.jsx';
import Settings from '../pages/settings/Settings.jsx';
import NotFound from '../pages/errors/NotFound.jsx';
import AccessDenied from '../pages/errors/AccessDenied.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/accept-invitation"
        element={<AcceptInvitation />}
      />

      {/* Authenticated Workspace Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="team" element={<Team />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Error Routes */}
      <Route path="/403" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
