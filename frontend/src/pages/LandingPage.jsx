import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Wind, ShieldAlert, Activity, BarChart2, Globe, Server } from 'lucide-react';
import { useState } from 'react';

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function LandingPage() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#0F0E0C] font-['DM_Sans',sans-serif] overflow-x-hidden selection:bg-[#0F0E0C] selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="AeroMesh Logo" className="w-8 h-8" />
            <span className="font-['Geist',sans-serif] font-bold text-lg tracking-tight">AeroMesh</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B6760]">
            <a href="#features" className="hover:text-[#0F0E0C] transition-colors relative group">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#0F0E0C] transition-all duration-200 group-hover:w-full"></span>
            </a>
            <a href="#how-it-works" className="hover:text-[#0F0E0C] transition-colors relative group">
              How it works
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#0F0E0C] transition-all duration-200 group-hover:w-full"></span>
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/report" className="text-sm font-medium hover:text-[#6B6760] transition-colors">Citizen Report</Link>
            <Link to="/map" className="text-sm font-medium bg-[#0F0E0C] text-white px-5 py-2.5 rounded-lg hover:bg-[#333333] transition-colors active:scale-95">
              Launch App
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsNavOpen(!isNavOpen)}>
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`w-full h-0.5 bg-[#0F0E0C] transition-all ${isNavOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
              <span className={`w-full h-0.5 bg-[#0F0E0C] transition-all ${isNavOpen ? 'opacity-0' : ''}`}></span>
              <span className={`w-full h-0.5 bg-[#0F0E0C] transition-all ${isNavOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
            </div>
          </button>
        </div>
        
        {/* Mobile menu */}
        {isNavOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-[#E8E6E1] p-6 flex flex-col gap-4 shadow-xl">
            <a href="#features" onClick={() => setIsNavOpen(false)} className="text-[#6B6760] font-medium">Features</a>
            <a href="#how-it-works" onClick={() => setIsNavOpen(false)} className="text-[#6B6760] font-medium">How it works</a>
            <hr className="border-[#E8E6E1]" />
            <Link to="/report" className="text-[#6B6760] font-medium">Citizen Report</Link>
            <Link to="/map" className="text-center font-medium bg-[#0F0E0C] text-white px-5 py-3 rounded-lg">Launch App</Link>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-6 md:pt-32 md:pb-40">
          <div className="max-w-[1200px] mx-auto text-center flex flex-col items-center">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] md:text-[13px] font-medium uppercase tracking-[0.08em] text-[#A8A49F] mb-6"
            >
              Federated Air Quality Early Warning System
            </motion.span>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-['Geist',sans-serif] text-[48px] md:text-[88px] font-bold leading-[1.05] tracking-[-0.025em] max-w-4xl text-[#0F0E0C] mb-8"
            >
              See the unseen. <br className="hidden md:block" />Protect the vulnerable.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-[20px] text-[#6B6760] max-w-2xl leading-[1.65] mb-10"
            >
              AeroMesh tracks transboundary pollution plumes in real-time, forecasting dispersion across economic corridors so agencies can coordinate response before the air turns gray.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Link to="/map" className="flex items-center justify-center gap-2 bg-[#0F0E0C] text-white px-6 py-3.5 rounded-lg font-medium hover:bg-[#333333] transition-all active:scale-95 group w-full sm:w-auto">
                Open Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/report" className="flex items-center justify-center gap-2 bg-transparent border border-[#E8E6E1] text-[#0F0E0C] px-6 py-3.5 rounded-lg font-medium hover:bg-[#F7F6F2] transition-all active:scale-95 w-full sm:w-auto">
                Report Incident
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Abstract App Preview */}
        <section className="px-6 pb-32">
          <div className="max-w-[1000px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="relative rounded-2xl border border-[#E8E6E1] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#F7F6F2] to-white z-0 opacity-50 pointer-events-none"></div>
              <div className="relative z-10 rounded-xl overflow-hidden bg-[#0F0E0C] aspect-video flex items-center justify-center">
                <img src="/test_smoke.jpg" alt="AeroMesh Interface" className="w-full h-full object-cover opacity-80 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0C] to-transparent"></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 md:py-32 bg-[#F7F6F2] px-6">
          <div className="max-w-[1200px] mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mb-16 md:mb-24 text-center md:text-left"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A8A49F] mb-4 block">Features</span>
              <h2 className="font-['Geist',sans-serif] text-[28px] md:text-[44px] font-bold leading-[1.15] tracking-[-0.015em] text-[#0F0E0C] max-w-2xl">
                Intelligence that crosses borders.
              </h2>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <FeatureCard 
                icon={<Wind />}
                title="HYSPLIT Dispersion"
                description="Real-time modeling of transboundary aerosol flows, predicting where pollution will settle up to 48 hours in advance."
              />
              <FeatureCard 
                icon={<Globe />}
                title="Federated Nodes"
                description="Distributed architecture allows regional agencies to share intelligence without centralizing sensitive environmental data."
              />
              <FeatureCard 
                icon={<ShieldAlert />}
                title="Citizen Verification"
                description="Ground-truth satellite anomalies instantly by dispatching SMS verification requests to citizens in affected zones."
              />
              <FeatureCard 
                icon={<Activity />}
                title="Multi-modal Detection"
                description="Fusing GOES/MODIS satellite imagery with terrestrial PM2.5 sensor networks to detect illegal burning instantly."
              />
              <FeatureCard 
                icon={<BarChart2 />}
                title="Impact Analytics"
                description="Correlate pollution exposure with demographic vulnerabilities to prioritize emergency healthcare response."
              />
              <FeatureCard 
                icon={<Server />}
                title="Air-gapped Reliability"
                description="Designed to operate efficiently even when regional nodes disconnect, syncing state seamlessly upon reconnection."
              />
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 md:py-32 px-6">
          <div className="max-w-[1000px] mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mb-20 text-center"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A8A49F] mb-4 block">Workflow</span>
              <h2 className="font-['Geist',sans-serif] text-[28px] md:text-[44px] font-bold leading-[1.15] tracking-[-0.015em] text-[#0F0E0C]">
                From detection to action.
              </h2>
            </motion.div>

            <div className="space-y-24">
              <StepItem 
                number="01"
                title="Detect & Validate"
                description="Satellites spot thermal anomalies. AeroMesh cross-references terrestrial sensors and deploys localized SMS inquiries to citizens to confirm large-scale burning."
              />
              <StepItem 
                number="02"
                title="Model & Forecast"
                description="Our backend spins up NOAA HYSPLIT trajectory models, computing precisely where the smoke plume will travel over the next two days based on high-altitude wind currents."
              />
              <StepItem 
                number="03"
                title="Coordinate & Respond"
                description="Adjacent regions receive early warnings detailing the estimated arrival time and PM2.5 density, allowing proactive health advisories before the air quality drops."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-[#F7F6F2] px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-[800px] mx-auto flex flex-col items-center"
          >
            <h2 className="font-['Geist',sans-serif] text-[32px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.02em] text-[#0F0E0C] mb-6">
              Ready to clear the air?
            </h2>
            <p className="text-lg text-[#6B6760] mb-10 max-w-[500px]">
              Access the federated network. Monitor your jurisdiction and receive transboundary alerts.
            </p>
            <Link to="/map" className="inline-flex items-center justify-center bg-[#0F0E0C] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#333333] transition-all active:scale-95 text-lg shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
              Launch Command Center
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white pt-24 pb-12 px-6 border-t border-[#E8E6E1]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <img src="/icon.png" alt="AeroMesh" className="w-6 h-6 grayscale opacity-80" />
                <span className="font-['Geist',sans-serif] font-bold text-lg">AeroMesh</span>
              </div>
              <a href="mailto:contact@aeromesh.org" className="font-['Geist',sans-serif] text-[24px] md:text-[32px] font-medium text-[#0F0E0C] hover:text-[#6B6760] transition-colors">
                contact@aeromesh.org
              </a>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A8A49F]">Platform</span>
                <Link to="/map" className="text-[#6B6760] hover:text-[#0F0E0C] transition-colors">Command Center</Link>
                <Link to="/report" className="text-[#6B6760] hover:text-[#0F0E0C] transition-colors">Citizen Portal</Link>
                <a href="#" className="text-[#6B6760] hover:text-[#0F0E0C] transition-colors">Documentation</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A8A49F]">Legal</span>
                <a href="#" className="text-[#6B6760] hover:text-[#0F0E0C] transition-colors">Privacy Policy</a>
                <a href="#" className="text-[#6B6760] hover:text-[#0F0E0C] transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[#E8E6E1] text-[#A8A49F] text-sm">
            <p>© {new Date().getFullYear()} AeroMesh Initiative.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[#0F0E0C] transition-colors">Twitter</a>
              <a href="#" className="hover:text-[#0F0E0C] transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <motion.div 
      variants={fadeUp}
      className="bg-white border border-[#E8E6E1] rounded-xl p-8 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-full bg-[#F7F6F2] flex items-center justify-center text-[#0F0E0C] mb-6">
        {icon}
      </div>
      <h3 className="font-['Geist',sans-serif] font-semibold text-xl mb-3 text-[#0F0E0C]">{title}</h3>
      <p className="text-[#6B6760] leading-relaxed text-[15px]">{description}</p>
    </motion.div>
  );
}

function StepItem({ number, title, description }) {
  return (
    <motion.div 
      variants={fadeUp}
      className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-16 items-start"
    >
      <span className="font-['Geist',sans-serif] text-[48px] md:text-[64px] font-bold text-[#E8E6E1] leading-none">
        {number}
      </span>
      <div className="pt-2">
        <h3 className="font-['Geist',sans-serif] text-[24px] font-semibold mb-3 text-[#0F0E0C]">{title}</h3>
        <p className="text-[#6B6760] text-lg leading-relaxed max-w-2xl">{description}</p>
      </div>
    </motion.div>
  );
}
