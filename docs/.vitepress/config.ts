import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'WCA Data Router',
  description:
    'Static WCA results API generator with a REST router and response caching.',
  lang: 'en-US',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'API', link: '/api/overview' },
      { text: 'Deploy', link: '/deploy/github-pages' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Quick start', link: '/guide/quick-start' },
          { text: 'Data model', link: '/guide/data-model' },
          { text: 'Static layout', link: '/guide/static-layout' },
          { text: 'Migration from wca-rest-api', link: '/guide/migration' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Overview', link: '/api/overview' },
          { text: 'OpenAPI', link: '/api/openapi' },
          { text: 'Static files', link: '/api/static' },
          { text: 'Router endpoints', link: '/api/router' },
          { text: 'Caching', link: '/api/caching' },
        ],
      },
      {
        text: 'Deploy',
        items: [
          { text: 'GitHub Pages / api branch', link: '/deploy/github-pages' },
          { text: 'Vercel', link: '/deploy/vercel' },
          { text: 'Self-hosted', link: '/deploy/self-hosted' },
        ],
      },
      {
        text: 'Develop',
        items: [
          { text: 'Repository layout', link: '/develop/layout' },
          { text: 'Builder', link: '/develop/builder' },
          { text: 'Router', link: '/develop/router' },
        ],
      },
    ],
    search: { provider: 'local' },
    footer: {
      message:
        'Unofficial. Data owned and maintained by the World Cube Association (worldcubeassociation.org/export/results).',
    },
  },
});
