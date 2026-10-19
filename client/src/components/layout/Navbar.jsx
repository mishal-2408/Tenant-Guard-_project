import React, { useState } from 'react';
import { Menu, LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, organization, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'org_admin':
        return 'badge-primary';
      case 'project_manager':
        return 'badge-warning';
      case 'viewer':
        return 'badge-secondary';
      default:
        return 'badge-success';
    }
  };

  const formatRoleName = (role) => {
    switch (role) {
      case 'org_admin':
        return 'Org Admin';
      case 'project_manager':
        return 'Project Manager';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Member';
    }
  };

  return (
    <header className="navbar">
      {/* Left: Mobile Toggle & Workspace Identification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          style={{ padding: '0.4rem', color: 'var(--text-main)', display: 'none' }}
          className="mobile-toggle-btn"
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {organization?.name || 'Workspace'}
          </span>
          <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>/</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {organization?.slug}
          </span>
        </div>
      </div>

      {/* Right: Security Status & User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
        {/* Verified Role Badge */}
        <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
          {formatRoleName(user?.role)}
        </span>

        {/* User Profile Dropdown Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)' }}
            className="user-menu-btn"
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              {user?.firstName?.[0] || 'U'}
            </div>
            <div style={{ textAlign: 'left', display: 'none' }} className="user-text-preview">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.email}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '220px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '0.5rem',
                zIndex: 50
              }}
            >
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                <UserIcon size={16} />
                Profile & Settings
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--danger)' }}
              >
                {isLoggingOut ? <div className="spinner spinner-dark" style={{ width: '14px', height: '14px' }}></div> : <LogOut size={16} />}
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
