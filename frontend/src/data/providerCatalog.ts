export type ProviderCategory = {
  id: string
  label: string
  description: string
  providers: string[]
}

export const providerCatalog: ProviderCategory[] = [
  {
    id: 'internet',
    label: 'Internet & TV',
    description: 'High-speed internet and streaming bundles we support across the U.S.',
    providers: ['Xfinity', 'Spectrum', 'AT&T Fiber', 'Verizon Fios', 'Cox Communications', 'Optimum', 'Frontier', 'RCN/Astound'],
  },
  {
    id: 'wireless',
    label: 'Mobile & Wireless',
    description: 'Major carriers and MVNO partners eligible for our managed payments.',
    providers: ['Verizon', 'AT&T', 'T-Mobile', 'Cricket Wireless', 'Boost Mobile', 'Mint Mobile', 'Visible', 'US Cellular'],
  },
  {
    id: 'energy',
    label: 'Electric & Energy',
    description: 'Leading utilities and energy co-ops across deregulated and regulated markets.',
    providers: ['Duke Energy', 'Georgia Power', 'Con Edison', 'PG&E', 'Dominion Energy', 'FPL', 'Oncor', 'CenterPoint Energy'],
  },
  {
    id: 'home',
    label: 'Home Services',
    description: 'Security, water, trash, and bundled home services we keep current for you.',
    providers: ['ADT Security', 'Vivint', 'American Water', 'Republic Services', 'Waste Management', 'Comcast Home', 'Brinks Home', 'Alarm.com'],
  },
]

export const featuredProviders = providerCatalog.flatMap((category) =>
  category.providers.slice(0, 2).map((name) => ({
    category: category.label,
    name,
  })),
)
