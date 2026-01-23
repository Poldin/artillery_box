'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Users, TrendingUp, Zap, BarChart3, Palette, Globe, Rocket, CheckCircle } from 'lucide-react';
import PartnerAuthDialog from '../components/PartnerAuthDialog';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function ItaPartnersPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const openAuth = (view: 'login' | 'register') => {
    setAuthView(view);
    setIsAuthOpen(true);
  };

  // Fix scroll for partner page
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    return () => {
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
            <span className="partner-logo-badge">Per Agenzie</span>
          </div>
          <button 
            onClick={() => openAuth('login')}
            className="partner-login-btn"
          >
            Accedi
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="partner-hero">
        <div className="partner-hero-content">
          <h1 className="partner-hero-title">
            Offri ai Tuoi Clienti<br />
            <span className="partner-hero-accent">Analytics Potenziati dall&apos;AI</span>
          </h1>
          <p className="partner-hero-subtitle">
            Sei un&apos;agenzia web o di marketing? Aggiungi Vetrinae al tuo portfolio di servizi. 
            I tuoi clienti potranno interrogare i loro dati in linguaggio naturale e ottenere insight immediati.
          </p>
          <div className="partner-hero-cta">
            <button 
              onClick={() => openAuth('register')}
              className="partner-btn-primary"
            >
              Diventa Partner
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => openAuth('login')}
              className="partner-btn-secondary"
            >
              Hai già un account?
            </button>
          </div>

          {/* Video Demo */}
          <div 
            className="loom-video-container"
            style={{ 
              position: 'relative', 
              paddingBottom: '41.875%', 
              height: 0,
              maxWidth: '900px',
              margin: '40px auto',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <iframe 
              src="https://www.loom.com/embed/72d2bd4e871942079f2ffc271a8eeb8a" 
              frameBorder="0" 
              allowFullScreen
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%' 
              }}
            />
          </div>

          {/* Google Slides Presentation */}
          <div 
            className="slides-container"
            style={{ 
              position: 'relative', 
              paddingBottom: '59.27%', 
              height: 0,
              maxWidth: '900px',
              margin: '40px auto',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <iframe 
              src="https://docs.google.com/presentation/d/1AXmbBlbygpMscDduJyrxriz4apw_Pw3Os3Yvvt3s4Zs/embed?start=false&loop=false&delayms=3000" 
              frameBorder="0" 
              allowFullScreen
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%' 
              }}
            />
          </div>
          <div 
            className="slides-actions"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginTop: '-20px',
              marginBottom: '20px'
            }}
          >
            <a 
              href="https://docs.google.com/presentation/d/1AXmbBlbygpMscDduJyrxriz4apw_Pw3Os3Yvvt3s4Zs/edit?usp=sharing" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#a1a1a1',
                fontSize: '14px',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #333',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e5e5e5';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a1a1a1';
                e.currentTarget.style.borderColor = '#333';
              }}
            >
              Apri in Google Slides
            </a>
            <a 
              href="https://docs.google.com/presentation/d/1AXmbBlbygpMscDduJyrxriz4apw_Pw3Os3Yvvt3s4Zs/export/pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#a1a1a1',
                fontSize: '14px',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #333',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e5e5e5';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a1a1a1';
                e.currentTarget.style.borderColor = '#333';
              }}
            >
              Scarica PDF
            </a>
          </div>

          {/* Partner Growth Analytics */}
          <div className="partner-hero-chart">
            <Plot
              data={[
                {
                  x: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                  y: [8, 15, 28, 42, 67, 95],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Agenzie Partner',
                  fill: 'tozeroy',
                  fillcolor: 'rgba(59, 130, 246, 0.2)',
                  line: {
                    color: '#3b82f6',
                    width: 3,
                    shape: 'spline'
                  },
                  hovertemplate: '<b>%{x}</b><br>Agenzie: %{y}<extra></extra>',
                }
              ]}
              layout={{
                autosize: true,
                height: 240,
                margin: { l: 50, r: 20, t: 50, b: 50 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#a1a1a1', size: 11 },
                annotations: [
                  {
                    text: 'Crescita Rete Partner Italia',
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
                    text: 'Agenzie Attive',
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
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </section>

      {/* Perché Vetrinae per le Agenzie */}
      <section className="partner-section">
        <div className="partner-section-content">
          <div className="partner-section-icon">
            <Rocket size={40} />
          </div>
          <h2 className="partner-section-title">
            Perché le Agenzie Scelgono Vetrinae
          </h2>
          <p className="partner-section-subtitle">
            I tuoi clienti hanno dati ovunque: CRM, e-commerce, analytics, fogli di calcolo. 
            Con Vetrinae possono finalmente capirli, senza competenze tecniche. Tu offri valore, loro ottengono risultati.
          </p>
          
          <div className="partner-features-grid">
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <Palette size={24} />
              </div>
              <h3 className="partner-feature-title">White-Label Completo</h3>
              <p className="partner-feature-desc">
                Personalizza l&apos;interfaccia con il tuo brand. I tuoi clienti vedranno solo il tuo logo e i tuoi colori.
              </p>
            </div>
            
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <Globe size={24} />
              </div>
              <h3 className="partner-feature-title">100% in Italiano</h3>
              <p className="partner-feature-desc">
                Interfaccia e AI che parlano italiano. I tuoi clienti possono fare domande come &quot;Quali prodotti hanno venduto di più a Milano?&quot;
              </p>
            </div>
            
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <Zap size={24} />
              </div>
              <h3 className="partner-feature-title">Setup in 5 Minuti</h3>
              <p className="partner-feature-desc">
                Collega qualsiasi database, Google Sheets o CSV. Nessuna configurazione complessa, nessun codice da scrivere.
              </p>
            </div>
          </div>

          {/* AI Conversation Example */}
          <div className="ai-conversation-demo">
            <div className="ai-message ai-message-user">
              Mostrami le vendite per regione dell&apos;ultimo trimestre
            </div>
            <div className="ai-message ai-message-assistant">
              <div className="ai-response-text" style={{ marginBottom: '16px' }}>
                Ecco l&apos;analisi delle vendite per regione nel Q4. La Lombardia guida con +34% rispetto al trimestre precedente:
              </div>
              <Plot
                data={[
                  {
                    x: ['Lombardia', 'Lazio', 'Veneto', 'Emilia-R.', 'Piemonte'],
                    y: [48500, 32100, 28700, 24300, 19800],
                    type: 'bar',
                    marker: {
                      color: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
                      line: { width: 0 }
                    },
                    hovertemplate: '<b>%{x}</b><br>€%{y:,.0f}<extra></extra>',
                  }
                ]}
                layout={{
                  autosize: true,
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
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Casi d'uso per Agenzie */}
      <section className="partner-section partner-section-alt">
        <div className="partner-section-content">
          <div className="partner-section-icon">
            <BarChart3 size={40} />
          </div>
          <h2 className="partner-section-title">
            Casi d&apos;Uso per i Tuoi Clienti
          </h2>
          <p className="partner-section-subtitle">
            Vetrinae si adatta a qualsiasi settore. Ecco come le agenzie partner lo usano ogni giorno.
          </p>
          
          <div className="partner-features-grid">
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <CheckCircle size={24} />
              </div>
              <h3 className="partner-feature-title">E-commerce</h3>
              <p className="partner-feature-desc">
                &quot;Quali prodotti hanno il margine più alto?&quot; &quot;Mostra i clienti che non comprano da 3 mesi&quot;
              </p>
            </div>
            
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <CheckCircle size={24} />
              </div>
              <h3 className="partner-feature-title">Ristoranti e Retail</h3>
              <p className="partner-feature-desc">
                &quot;Qual è il giorno con più incassi?&quot; &quot;Confronta le vendite di questo mese con l&apos;anno scorso&quot;
              </p>
            </div>
            
            <div className="partner-feature-card">
              <div className="partner-feature-icon">
                <CheckCircle size={24} />
              </div>
              <h3 className="partner-feature-title">B2B e Servizi</h3>
              <p className="partner-feature-desc">
                &quot;Lista i clienti con fatturato sopra 50k&quot; &quot;Quali commerciali hanno chiuso più contratti?&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="partner-section">
        <div className="partner-section-content">
          <div className="partner-section-icon">
            <TrendingUp size={40} />
          </div>
          <h2 className="partner-section-title">
            Un Modello Semplice e Trasparente
          </h2>
          <p className="partner-section-subtitle">
            Tu decidi il prezzo per i tuoi clienti. Noi ti chiediamo solo una quota fissa per utente. 
            Il margine è tutto tuo.
          </p>
          
          <div className="partner-pricing-box">
            <p className="partner-pricing-intro">
              Tutti i partner iniziano con il <span className="partner-pricing-highlight">Piano Standard</span>
            </p>
            
            <div className="partner-pricing-tiers">
              <div className="partner-pricing-tier">
                <p className="partner-pricing-label">Primo Cliente</p>
                <p className="partner-pricing-price">
                  €10,90<span className="partner-pricing-period">/mese</span>
                </p>
              </div>
              
              <div className="partner-pricing-tier">
                <p className="partner-pricing-label">Clienti Successivi</p>
                <p className="partner-pricing-price">
                  €7,90<span className="partner-pricing-period">/mese cad.</span>
                </p>
              </div>
            </div>

            <p className="partner-pricing-note">
              Sei tu a decidere quanto far pagare ai tuoi clienti. Il margine è tuo al 100%. <br />
              <span className="partner-pricing-disclaimer">
                IVA esclusa · Richiesta valutazione iniziale · Review periodiche per garantire qualità
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="partner-footer-cta">
        <h2 className="partner-footer-title">Pronto a Iniziare?</h2>
        <p className="partner-footer-subtitle">
          Unisciti alle agenzie italiane che stanno già offrendo analytics AI ai loro clienti
        </p>
        <button 
          onClick={() => openAuth('register')}
          className="partner-btn-primary partner-btn-large"
        >
          Richiedi Accesso Partner
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
