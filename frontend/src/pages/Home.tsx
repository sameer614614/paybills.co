import FeatureHighlights from '../components/sections/FeatureHighlights'
import FAQ from '../components/sections/FAQ'
import Hero from '../components/sections/Hero'
import ProcessTimeline from '../components/sections/ProcessTimeline'
import ProviderShowcase from '../components/sections/ProviderShowcase'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <FeatureHighlights />
      <ProviderShowcase />
      <ProcessTimeline />
      <FAQ />
    </div>
  )
}
