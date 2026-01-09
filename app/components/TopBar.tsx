'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Settings, LogOut, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthProvider';

export default function TopBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, signOut, isLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get user initials
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header 
      className="flex items-center justify-between px-4 border-b select-none"
      style={{ 
        height: 'var(--topbar-height)',
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* Left section - Brand */}
      <div className="flex items-center gap-3">
        <span 
          className="font-semibold text-sm tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          artillery_box
        </span>
      </div>

      {/* Center section - Actions */}
      <div className="flex items-center gap-1">
        <Link 
          href="/"
          className="btn-ghost flex items-center gap-2 text-sm"
          style={{
            color: pathname === '/' ? 'var(--accent-primary)' : undefined,
            background: pathname === '/' ? 'var(--bg-hover)' : undefined
          }}
        >
          <LayoutDashboard size={16} />
          dashboard
        </Link>

        <Link 
          href="/data-sources"
          className="btn-ghost flex items-center gap-2 text-sm"
          style={{
            color: pathname === '/data-sources' ? 'var(--accent-primary)' : undefined,
            background: pathname === '/data-sources' ? 'var(--bg-hover)' : undefined
          }}
        >
          <Database size={16} />
          data sources
        </Link>

        <Link 
          href="/settings"
          className="btn-ghost flex items-center gap-2 text-sm"
          style={{
            color: pathname === '/settings' ? 'var(--accent-primary)' : undefined,
            background: pathname === '/settings' ? 'var(--bg-hover)' : undefined
          }}
        >
          <Settings size={16} />
          settings
        </Link>
      </div>

      {/* Right section - User */}
      <div className="flex items-center gap-1">
        {isLoading ? (
          <div 
            className="w-7 h-7 rounded-full animate-pulse"
            style={{ background: 'var(--bg-tertiary)' }}
          />
        ) : isAuthenticated && user ? (
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
              style={{ background: showUserMenu ? 'var(--bg-hover)' : 'transparent' }}
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                {getUserInitials()}
              </div>
            </button>
            
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div 
                  className="absolute right-0 top-full mt-1 w-56 py-1 rounded-lg shadow-xl z-50"
                  style={{ 
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div 
                    className="px-3 py-2 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ background: 'var(--accent-primary)', color: 'white' }}
                      >
                        {getUserInitials()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={14} />
                    Account Settings
                  </Link>

                  <button 
                    onClick={() => {
                      signOut();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                    style={{ color: 'var(--accent-error)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
