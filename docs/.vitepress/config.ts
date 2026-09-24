import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE ?? '/wca-data-router/';

export default defineConfig({
  title: 'WCA Data Router',
  description:
    'Static WCA results API generator with a REST router and response caching.',
  lang: 'en-US',
  // GitHub Pages project site: https://<user>.github.io/wca-data-router/
  base,
  cleanUrls: true,
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
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
              {
                text: 'Migration from wca-rest-api',
                link: '/guide/migration',
              },
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
              {
                text: 'GitHub Pages / api branch',
                link: '/deploy/github-pages',
              },
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
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Updated at' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        darkModeSwitchLabel: 'Theme',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Back to top',
        langMenuLabel: 'Change language',
        footer: {
          message:
            'Unofficial. Data owned and maintained by the World Cube Association (worldcubeassociation.org/export/results).',
        },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'WCA Data Router',
      description: '静态 WCA 成绩 API 生成器，内置 REST 路由与响应缓存。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/introduction' },
          { text: 'API', link: '/zh/api/overview' },
          { text: '部署', link: '/zh/deploy/github-pages' },
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '介绍', link: '/zh/guide/introduction' },
              { text: '快速开始', link: '/zh/guide/quick-start' },
              { text: '数据模型', link: '/zh/guide/data-model' },
              { text: '静态目录结构', link: '/zh/guide/static-layout' },
              {
                text: '从 wca-rest-api 迁移',
                link: '/zh/guide/migration',
              },
            ],
          },
          {
            text: 'API',
            items: [
              { text: '概览', link: '/zh/api/overview' },
              { text: 'OpenAPI', link: '/zh/api/openapi' },
              { text: '静态文件', link: '/zh/api/static' },
              { text: '路由端点', link: '/zh/api/router' },
              { text: '缓存', link: '/zh/api/caching' },
            ],
          },
          {
            text: '部署',
            items: [
              {
                text: 'GitHub Pages / api 分支',
                link: '/zh/deploy/github-pages',
              },
              { text: 'Vercel', link: '/zh/deploy/vercel' },
              { text: '自托管', link: '/zh/deploy/self-hosted' },
            ],
          },
          {
            text: '开发',
            items: [
              { text: '仓库结构', link: '/zh/develop/layout' },
              { text: 'Builder', link: '/zh/develop/builder' },
              { text: 'Router', link: '/zh/develop/router' },
            ],
          },
        ],
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        darkModeSwitchLabel: '主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        langMenuLabel: '切换语言',
        footer: {
          message:
            '非官方项目。数据由 World Cube Association 所有并维护（worldcubeassociation.org/export/results）。',
        },
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详情',
                resetButtonTitle: '清除查询条件',
                backButtonTitle: '返回',
                noResultsText: '无法找到相关结果',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
  },
});
