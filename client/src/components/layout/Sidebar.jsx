import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert,
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Settings, 
  X,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Sidebar = ({ isOpen, onClose }) => {
  const { organization, user } = useAuth();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/team', label: 'Team', icon: Users },
    ...(user?.role === 'org_admin' ? [{ to: '/security', label: 'Security Center', icon: ShieldAlert }] : []),
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Sidebar Brand Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff'
          }}>
            <ShieldCheck size={20} />
          </div>
          <span className="sidebar-brand">TenantGuard</span>
        </div>

        {/* Mobile Close Button */}
        <button 
          onClick={onClose} 
          style={{ color: 'var(--text-sidebar)', display: 'none' }}
          className="mobile-close-btn"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Tenant / Workspace Verified Badge Footer */}
      <div className="sidebar-footer">
        <div className="tenant-badge">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span className="tenant-badge-label">Active Workspace</span>
            <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(37,99,235,0.2)', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
              {organization?.plan || 'Free'}
            </span>
          </div>
          <div className="tenant-badge-name" title={organization?.name}>
            {organization?.name || 'Workspace Portal'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.72rem', color: '#34d399' }}>
            <Lock size={12} />
            <span>Boundary Isolated</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
