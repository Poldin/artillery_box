'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Users, TrendingUp, Sparkles, BarChart3, MessageSquare, Database } from 'lucide-react';
import PartnerAuthDialog from '../components/PartnerAuthDialog';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function PartnerPortal() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const openAuth = (view: 'login' | 'register') => {
    setAuthView(view);
    setIsAuthOpen(true);
  };

  // Fix scroll for partner page
  useEffect(() => {
    // Allow scroll on this page
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    return () => {
      // Restore original overflow when leaving the page
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, []);

  return (
    <div className="partner-portal">
      {/* Header */}
      <header className="partner-header">
        <div className="partner-header-content">
          <div className="partner-logo">
            <span className="partner-logo-text">Vetrinae</span>
            <span className="partner-logo-badge">Partner Portal</span>
          </div>
          <button 
            onClick={() => openAuth('login')}
            className="partner-login-btn"
          >
            Partner Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="partner-hero">
        <div className="partner-hero-content">
          <h1 className="partner-hero-title">
            Unlock Revenue Opportunities<br />
            <span className="partner-hero-accent">As a Vetrinae Partner</span>
          </h1>
          <p className="partner-hero-subtitle">
            Join our partner ecosystem and empower your clients with cutting-edge AI-powered data analytics. 
            Earn competitive margins while delivering exceptional value.
          </p>
          <div className="partner-hero-cta">
            <button 
              onClick={() => openAuth('register')}
              className="partner-btn-primary"
            >
              Become a Partner
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => openAuth('login')}
              className="partner-btn-secondary"
            >
              Partner Sign In
            </button>
          </div>

          {/* Partner Growth Analytics */}
          <div className="partner-hero-chart">
            <Plot
              data={[
                {
                  x: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025'],
                  y: [12, 28, 47, 85, 142, 218],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Active Partners',
                  fill: 'tozeroy',
                  fillcolor: 'rgba(59, 130, 246, 0.2)',
                  line: {
                    color: '#3b82f6',
                    width: 3,
                    shape: 'spline'
                  },
                  hovertemplate: '<b>%{x}</b><br>Partners: %{y}<extra></extra>',
                }
              ]}
              layout={{
                width: 600,
                height: 240,
                margin: { l: 50, r: 20, t: 50, b: 50 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#a1a1a1', size: 11 },
                annotations: [
                  {
                    text: 'Partner Network Growth',
                    xref: 'paper',
                    yref: 'paper',
                    x: 0,
                    y: 1.1,
                    xanchor: 'left',
                    yanchor: 'bottom',
                    showarrow: false,
                    font: { color: '#e5e5e5', size: 14, family: 'inherit' }
                  }
                ],
                xaxis: {
                  gridcolor: '#252525',
                  showgrid: false,
                },
                yaxis: {
                  gridcolor: '#252525',
                  title: { 
                    text: 'Active Partners',
                    font: { color: '#e5e5e5' }
                  }
                },
                hoverlabel: {
                  bgcolor: '#1f1f1f',
                  bordercolor: '#3b82f6',
                  font: { color: '#e5e5e5' }
                }
              }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>
      </section>

      {/* Partner-Only Distribution Model */}
      <section className="partner-section">
        <div className="partner-section-content">
          <div className="partner-section-icon">
            <Users size={40} />
          </div>
          <h2 className="partner-section-title">
            We Only Sell Through Partners
          </h2>
          <p className="partner-section-subtitle">
            Vetrinae operates exclusively through our partner network. We believe in empowering 
            businesses like yours to deliver AI-powered solutions to your clients, while we focus 
            on building the best technology.
          </p>
          
          <div className="partner-features-grid">
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <Database size={24} />
              </div>
              <h3 className="partner-feature-title">White-Label Ready</h3>
              <p className="partner-feature-desc">
                Deliver Vetrinae under your brand with customizable interfaces and branding options.
              </p>
            </div>
            
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <MessageSquare size={24} />
              </div>
              <h3 className="partner-feature-title">Dedicated Support</h3>
              <p className="partner-feature-desc">
                Get priority technical support and partner success management to help you win.
              </p>
            </div>
            
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <BarChart3 size={24} />
              </div>
              <h3 className="partner-feature-title">Revenue Dashboard</h3>
              <p className="partner-feature-desc">
                Track your client portfolio, usage metrics, and revenue in real-time.
              </p>
            </div>
          </div>

          {/* AI Conversation Example */}
          <div className="ai-conversation-demo">
            <div className="ai-message ai-message-user">
              Show me sales trends for Q4
            </div>
            <div className="ai-message ai-message-assistant">
              <div className="ai-response-text" style={{ marginBottom: '16px' }}>
                Here&apos;s your Q4 sales analysis. Sales increased 23% compared to Q3, with strongest performance in December:
              </div>
              <Plot
                data={[
                  {
                    x: ['Oct', 'Nov', 'Dec'],
                    y: [12500, 14200, 18900],
                    type: 'bar',
                    marker: {
                      color: '#3b82f6',
                      line: { width: 0 }
                    },
                    hovertemplate: '<b>%{x}</b><br>€%{y:,.0f}<extra></extra>',
                  }
                ]}
                layout={{
                  width: 400,
                  height: 180,
                  margin: { l: 50, r: 20, t: 10, b: 40 },
                  paper_bgcolor: '#0d0d0d',
                  plot_bgcolor: '#0d0d0d',
                  font: { color: '#a1a1a1', size: 11 },
                  xaxis: {
                    gridcolor: '#252525',
                    showgrid: false,
                  },
                  yaxis: {
                    gridcolor: '#252525',
                    tickprefix: '€',
                  },
                  hoverlabel: {
                    bgcolor: '#1f1f1f',
                    bordercolor: '#3b82f6',
                    font: { color: '#e5e5e5' }
                  }
                }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Solid Partnerships */}
      <section className="partner-section partner-section-alt">
        <div className="partner-section-content">
          <div className="partner-section-icon">
            <TrendingUp size={40} />
          </div>
          <h2 className="partner-section-title">
            We Grow Through Solid Partnerships
          </h2>
          <p className="partner-section-subtitle">
            We believe in building long-term relationships based on trust and mutual success. 
            You maintain full control over pricing and client relationships, while we provide the technology and support you need to thrive.
          </p>
          
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '2rem',
            marginTop: '2.5rem',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <p style={{ fontSize: '0.95rem', color: '#d1d1d1', marginBottom: '1.5rem', textAlign: 'center' }}>
              All partners start with our <span style={{ fontWeight: '600', color: '#e5e5e5' }}>Standard Partnership Plan</span>
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '2rem', 
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '1.5rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#a1a1a1', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  First Customer
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#3b82f6' }}>
                  €10.90<span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#a1a1a1' }}>/month</span>
                </p>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#a1a1a1', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Subsequent Customers
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#3b82f6' }}>
                  €7.90<span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#a1a1a1' }}>/month each</span>
                </p>
              </div>
            </div>

            <p style={{ 
              fontSize: '0.8rem', 
              color: '#a1a1a1', 
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              You set your own retail prices and keep the margin. <br />
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                VAT excluded · Initial partner evaluation required · Ongoing performance reviews ensure partnership quality
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="partner-footer-cta">
        <h2 className="partner-footer-title">Ready to Get Started?</h2>
        <p className="partner-footer-subtitle">
          Join hundreds of partners already growing their business with Vetrinae
        </p>
        <button 
          onClick={() => openAuth('register')}
          className="partner-btn-primary partner-btn-large"
        >
          Apply for Partnership
          <ArrowRight size={24} />
        </button>
      </section>

      {/* Partner Auth Dialog */}
      <PartnerAuthDialog 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)}
        initialView={authView}
      />
    </div>
  );
}
