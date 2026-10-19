import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Register = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    slug: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-generate slug from organization name if user hasn't typed custom slug
      if (name === 'organizationName' && !prev.slugModified) {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return updated;
    });
  };

  const handleSlugChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      slugModified: true
    }));
  };

  const validateClientSide = () => {
    if (!formData.organizationName.trim()) return 'Organization name is required.';
    if (!formData.firstName.trim() || !formData.lastName.trim()) return 'Please enter your first and last name.';
    if (!formData.email.trim()) return 'Please enter a valid email address.';
    if (formData.password.length < 8) return 'Password must be at least 8 characters long.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}_+\-=.,<>:;~`|])/;
    if (!passwordRegex.test(formData.password)) {
      return 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const validationError = validateClientSide();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await register({
        organizationName: formData.organizationName.trim(),
        slug: formData.slug.trim() || undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '2rem 1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Register New Workspace
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Create an isolated multi-tenant organization partition
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {errorMessage && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Organization Info */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                1. Organization Details
              </h2>

              <div className="form-group">
                <label className="form-label" htmlFor="organizationName">
                  Organization Name *
                </label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Acme Corporation"
                  value={formData.organizationName}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="slug">
                  Workspace URL Slug
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>tenantguard.app/</span>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    className="form-input"
                    placeholder="acme-corp"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Administrator Info */}
            <div style={{ marginBottom: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                2. Organization Administrator Account
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Jane"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Administrator Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="jane@acmecorp.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Min 8 characters (Upper, Lower, Number, Symbol)"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Provisioning Workspace...
                </>
              ) : (
                <>
                  Provision Organization
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-light)',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            Already have an organization?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Sign in to workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
