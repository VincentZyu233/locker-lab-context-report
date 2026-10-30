import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  defineConfig({
  title: 'LockerLab 上下文工程报告',
  description: '《软件设计与体系结构》第3章：DeepSeek Harness 三层上下文工程与高效记忆管理实践报告',
  base: process.env.BASE_URL || '/locker-lab-context-report/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/locker-lab-context-report/favicon.png' }],
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/locker-lab-context-report/favicon.ico' }],
    ['link', { rel: 'shortcut icon', href: '/locker-lab-context-report/favicon.ico' }]
  ],
  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true
    }
  },
  themeConfig: {
    siteTitle: 'LockerLab Context Governance',
    logo: '/logo.png',
    nav: [
      { text: '首页', link: '/' },
      { text: '报告全文', link: '/full-report' },
      {
        text: '分章阅读',
        items: [
          { text: '第1章 实验环境', link: '/chapters/01-environment' },
          { text: '第2章 三层架构', link: '/chapters/02-architecture' },
          { text: '第3章 实测数据', link: '/chapters/03-experiments' },
          { text: '第4章 故障自愈', link: '/chapters/04-failures' },
          { text: '第5章 思考题', link: '/chapters/05-questions' },
          { text: '第6章 总结', link: '/chapters/06-summary' },
        ]
      },
      { text: '📷 证据画廊', link: '/gallery' },
      { text: 'GitHub 仓库', link: 'https://github.com/VincentZyu233/locker-lab-context-report' }
    ],
    sidebar: [
      {
        text: '报告导读',
        items: [
          { text: '首页概览', link: '/' },
          { text: '完整报告单页版', link: '/full-report' },
          { text: '📷 实验证据链画廊', link: '/gallery' }
        ]
      },
      {
        text: '实验报告章节',
        items: [
          { text: '第 1 章：环境与运行基线', link: '/chapters/01-environment' },
          { text: '第 2 章：三层上下文架构剖析', link: '/chapters/02-architecture' },
          { text: '第 3 章：五大核心实验实测与量化表', link: '/chapters/03-experiments' },
          { text: '第 4 章：故障排查与自愈分析', link: '/chapters/04-failures' },
          { text: '第 5 章：思考题架构级深入解答', link: '/chapters/05-questions' },
          { text: '第 6 章：方法论总结与迁移展望', link: '/chapters/06-summary' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/VincentZyu233/locker-lab-context-report' }
    ],
    footer: {
      message: '《软件设计与体系结构》课程实验报告 · 基于 DeepSeek Harness 架构',
      copyright: 'Copyright © 2026 VincentZyu'
    },
    search: {
      provider: 'local'
    }
  }
})
);
