import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wind, ShieldAlert, Activity, Layers, MapPin, Satellite, ChevronDown, Menu, X } from 'lucide-react';

const features = [
  { icon: <Layers />, title: 'One map, more context', description: 'Explore monitoring stations, fire detections and atmospheric layers together. Choose the layers that help answer your next question.' },
  { icon: <Wind />, title: 'Regional forecasts', description: 'Explore wind and air-quality forecasts from Open-Meteo, including GFS weather and CAMS Global air quality. These are regional estimates, not street-level measurements.' },
  { icon: <MapPin />, title: 'Citizen observations', description: 'Use the mobile web portal to submit a location, description and photo of a pollution concern. Reports add local context for review.' },
  { icon: <Satellite />, title: 'Satellite fire evidence', description: 'Review available NASA FIRMS thermal detections alongside other evidence. A satellite hotspot is a signal to investigate, not proof of a pollution source.' },
  { icon: <Activity />, title: 'Ground-level measurements', description: 'Inspect available PM2.5 monitoring data from OpenAQ. Coverage and freshness depend on the contributing station and data provider.' },
  { icon: <ShieldAlert />, title: 'Evidence before action', description: 'Review events, supporting observations and available model outputs in the command center to inform further investigation.' },
];

const steps = [
  { title: 'Explore the signals', description: 'Open the map and select a region. Bring together available station readings, fire detections and wind layers to understand the wider picture.' },
  { title: 'Examine the evidence', description: 'Inspect an event and compare observations with forecast context. Check timestamps and source availability before drawing conclusions.' },
  { title: 'Add local context', description: 'Share an observation through the citizen portal. A location, description and photo can help reviewers understand what is happening on the ground.' },
];

export default function LandingPage() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    // WAI-ARIA APG: disclosure navigation uses native links, not menu roles.
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) setIsNavOpen(false); };
    const closeOutside = event => {
      if (!navRef.current?.contains(event.target)) setIsNavOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, []);

  const goToSection = event => {
    const target = document.getElementById(event.currentTarget.hash.slice(1));
    if (target) {
      // Move focus out of the disclosure before hiding its links.
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    }
    setIsNavOpen(false);
  };

  return (
    <div className="landing-page" id="landing-top">
      <a href="#landing-main" className="landing-skip" onClick={goToSection}>Skip to content</a>
      <header className="landing-header">
        <nav
          ref={navRef}
          aria-label="Main navigation"
          className="landing-container landing-nav"
          onKeyDown={event => {
            if (event.key === 'Escape' && isNavOpen) {
              setIsNavOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsNavOpen(false);
          }}
        >
          <a href="#landing-main" onClick={goToSection} className="landing-brand" aria-label="AeroMesh home">
            <img src="/icon.png" alt="" width="32" height="32" />
            <span>AeroMesh</span>
          </a>
          <div className="landing-desktop-links">
            <a href="#features" onClick={goToSection}>Features</a>
            <a href="#how-it-works" onClick={goToSection}>How it works</a>
            <a href="#faq" onClick={goToSection}>FAQ</a>
          </div>
          <div className="landing-desktop-actions">
            <Link to="/report">Citizen report</Link>
            <Link to="/map" className="landing-button landing-button-dark">Open dashboard <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className="landing-menu-toggle"
            aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isNavOpen}
            aria-controls="landing-mobile-navigation"
            onClick={() => setIsNavOpen(open => !open)}
          >
            {isNavOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <div id="landing-mobile-navigation" className="landing-mobile-links" hidden={!isNavOpen}>
            <a href="#features" onClick={goToSection}>Features</a>
            <a href="#how-it-works" onClick={goToSection}>How it works</a>
            <a href="#faq" onClick={goToSection}>FAQ</a>
            <Link to="/report" onClick={() => setIsNavOpen(false)}>Citizen report</Link>
            <Link to="/map" onClick={() => setIsNavOpen(false)} className="landing-button landing-button-dark">Open dashboard <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </nav>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="landing-hero landing-container" aria-labelledby="hero-heading">
          <p className="landing-eyebrow landing-enter"><span className="landing-accent-line" /> Air quality, in context</p>
          <h1 id="hero-heading" className="landing-enter">See the unseen.<br /><span>Protect the vulnerable.</span></h1>
          <p className="landing-hero-description landing-enter">A clearer picture of the air we share. Explore pollution observations, regional forecasts and citizen reports in one place.</p>
          <div className="landing-actions landing-enter">
            <Link to="/map" className="landing-button landing-button-dark">Open dashboard <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link to="/report" className="landing-button landing-button-light">Report an observation <MapPin size={18} aria-hidden="true" /></Link>
          </div>
          <p className="landing-hero-note">Explore the map on desktop. Share an observation from your phone.</p>
        </section>

        {/* A conceptual preview carries no invented readings or live-status indicators. */}
        <section className="landing-preview-section landing-container" aria-labelledby="preview-heading">
          <div className="landing-preview">
            <div className="landing-preview-toolbar">
              <span><Layers size={17} aria-hidden="true" /> The AeroMesh workspace</span>
              <span className="landing-preview-label">Conceptual overview</span>
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-intro">
                <p className="landing-eyebrow">A shared view</p>
                <h2 id="preview-heading">Connect the signals.<br />See the bigger picture.</h2>
                <p>Move from a regional view to the evidence behind an observation.</p>
                <Link to="/map" className="landing-text-link">Explore the workspace <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
              <div className="landing-layer-stack" aria-label="Workspace layers">
                <div className="landing-preview-layer"><span className="landing-layer-icon"><Wind aria-hidden="true" /></span><div><strong>Atmospheric context</strong><span>Regional wind & air-quality forecasts</span></div></div>
                <div className="landing-preview-layer"><span className="landing-layer-icon"><Satellite aria-hidden="true" /></span><div><strong>Environmental evidence</strong><span>Station readings & thermal detections</span></div></div>
                <div className="landing-preview-layer"><span className="landing-layer-icon"><MapPin aria-hidden="true" /></span><div><strong>Local observations</strong><span>Reports from the citizen portal</span></div></div>
              </div>
            </div>
            <p className="landing-preview-caption">An overview of the workflow. Open the dashboard to check available data and source timestamps.</p>
          </div>
          <div className="landing-source-strip">
            <p>Data sources, when available</p>
            <ul aria-label="Data sources"><li>OpenAQ</li><li>NASA FIRMS</li><li>Open-Meteo</li><li>CAMS Global</li></ul>
            <span>Availability depends on coverage and configuration. Names identify sources, not partnerships.</span>
          </div>
        </section>

        <section id="features" tabIndex={-1} className="landing-section landing-tinted" aria-labelledby="features-heading">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div><p className="landing-eyebrow">Features</p><h2 id="features-heading">Intelligence that<br />brings context together.</h2></div>
              <p>Start with the evidence. Explore the relationships between what is measured, what is modeled and what people observe.</p>
            </div>
            <div className="landing-feature-grid">
              {features.map(feature => <FeatureCard key={feature.title} {...feature} />)}
            </div>
          </div>
        </section>

        <section id="how-it-works" tabIndex={-1} className="landing-section" aria-labelledby="workflow-heading">
          <div className="landing-container landing-workflow">
            <div><p className="landing-eyebrow">How it works</p><h2 id="workflow-heading">From a signal<br />to understanding.</h2><p className="landing-workflow-intro">A practical workflow for exploring air quality and contributing local knowledge.</p><Link to="/map" className="landing-text-link">Start with the map <ArrowRight size={17} aria-hidden="true" /></Link></div>
            <ol className="landing-steps">
              {steps.map((step, index) => (
                <li key={step.title}><span className="landing-step-number" aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-tinted" aria-labelledby="context-heading">
          <div className="landing-container landing-context">
            <div><p className="landing-eyebrow">Know what you are seeing</p><h2 id="context-heading">Useful evidence.<br />Clear boundaries.</h2></div>
            <div className="landing-context-copy"><p>Measurements, forecasts and citizen reports answer different questions. A regional forecast describes modeled conditions; a station records conditions at its location; a report shares an observation that needs review.</p><p>Check each source’s timestamp and coverage. AeroMesh supports investigation and awareness; follow local authorities for official health and emergency guidance.</p></div>
          </div>
        </section>

        <section id="faq" tabIndex={-1} className="landing-section" aria-labelledby="faq-heading">
          <div className="landing-faq-container">
            <p className="landing-eyebrow">A little more clarity</p>
            <h2 id="faq-heading">Frequently asked questions</h2>
            <div className="landing-faq-list">
              <FaqItem question="What can I explore in the dashboard?" answer="The map brings together available monitoring stations, fire detections, wind and air-quality forecast layers. Data availability varies by region, provider and deployment configuration. Check source timestamps before interpreting a layer." />
              <FaqItem question="Do I need to install an app to report an observation?" answer="No. Open the citizen portal in your browser to submit an observation with a location, description and photo. The web portal is the reporting path; SMS reporting is not currently available." />
              <FaqItem question="Are air-quality forecasts the same as HYSPLIT dispersion?" answer="No. Regional air-quality forecasts use CAMS Global data through Open-Meteo. Event-specific HYSPLIT dispersion is a separate, on-demand workflow that requires a configured NOAA service and a successfully completed run. Neither provides a guarantee of conditions at a specific address." />
              <FaqItem question="Does AeroMesh operate a federated agency network?" answer="A federated agency network is a project direction, not an operational capability of this release. Regional views do not imply independent agency nodes, cross-border data-sharing agreements or official partnerships." />
            </div>
          </div>
        </section>

        <section className="landing-cta landing-container" aria-labelledby="cta-heading">
          <p className="landing-eyebrow">Your next step</p>
          <h2 id="cta-heading">Ready to see the bigger picture?</h2>
          <p>Explore the available evidence, or add an observation from your community.</p>
          <div className="landing-actions"><Link to="/map" className="landing-button landing-button-dark">Open dashboard <ArrowRight size={18} aria-hidden="true" /></Link><Link to="/report" className="landing-button landing-button-light">Make a citizen report</Link></div>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <div><a href="#landing-main" onClick={goToSection} className="landing-brand"><img src="/icon.png" alt="" width="28" height="28" /><span>AeroMesh</span></a><p>A clearer picture of the air we share.</p></div>
        <nav aria-label="Footer navigation"><Link to="/map">Dashboard</Link><Link to="/report">Citizen portal</Link><a href="#faq" onClick={goToSection}>Questions & answers</a></nav>
        <p className="landing-copyright">© {new Date().getFullYear()} AeroMesh</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return <article className="landing-feature-card"><div className="landing-feature-icon" aria-hidden="true">{icon}</div><h3>{title}</h3><p>{description}</p></article>;
}

function FaqItem({ question, answer }) {
  return <details className="landing-faq-item"><summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary><p>{answer}</p></details>;
}
