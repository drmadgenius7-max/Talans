import { useCallback, useState } from 'react';
import Navbar from './components/Navbar';
import ScrollProgress from './components/ScrollProgress';
import Loader from './components/Loader';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';

import HeroSection from './sections/HeroSection';
import MarqueeSection from './sections/MarqueeSection';
import AboutSection from './sections/AboutSection';
import CompaniesSection from './sections/CompaniesSection';
import InvestmentSection from './sections/InvestmentSection';
import ServicesSection from './sections/ServicesSection';
import ProjectsSection from './sections/ProjectsSection';
import VisionSection from './sections/VisionSection';
import OpportunitiesSection from './sections/OpportunitiesSection';
import ContactSection from './sections/ContactSection';

import type { FormDefinition } from './data/forms';

export function App() {
  const [activeForm, setActiveForm] = useState<FormDefinition | null>(null);

  const openForm = useCallback((form: FormDefinition) => setActiveForm(form), []);
  const closeForm = useCallback(() => setActiveForm(null), []);

  return (
    <>
      <Loader />
      <ScrollProgress />
      <Navbar />

      <main className="clip-x relative bg-ink">
        <HeroSection />
        <MarqueeSection />
        <AboutSection />
        <CompaniesSection />
        <InvestmentSection />
        <ServicesSection />
        <ProjectsSection />
        <VisionSection />
        <OpportunitiesSection onOpenForm={openForm} />
        <ContactSection />
      </main>

      <Footer />

      <ContactForm form={activeForm} onClose={closeForm} />
    </>
  );
}

export default App;
