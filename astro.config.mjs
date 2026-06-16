// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

/**
 * Portfolio theme URL — switches between local dev and production.
 * In dev: requires the portfolio running at http://localhost:4321
 * In production: served from GitHub Pages
 */
const isProd = process.env.NODE_ENV === 'production';
const PORTFOLIO_THEME_URL = isProd
  ? 'https://Superkorlas.github.io/about-me/theme.css'
  : 'http://localhost:4321/about-me/theme.css';

/**
 * GitHub Pages base path.
 * Change BASE_PATH env var if the repo is named differently.
 * Default: /Unity-InteractionSystem (deployed from github.com/Superkorlas/Unity-InteractionSystem)
 */
const BASE = process.env.BASE_PATH ?? '/DOC-Unity-InteractionSystem/';

export default defineConfig({
  site: 'https://Superkorlas.github.io',
  base: '/DOC-Unity-InteractionSystem/',

  integrations: [
    starlight({
      title: 'Interaction System',
      description:
        'Modular, raycast-based interaction system for Unity — camera-agnostic and input-agnostic.',

      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Quick Start', slug: 'quick-start' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Action Types', slug: 'guides/actions' },
            { label: 'Extending the System', slug: 'guides/extending' },
            { label: 'Event System', slug: 'guides/events' },
          ],
        },
        {
          label: 'API Reference',
          collapsed: false,
          autogenerate: { directory: 'api' },
        },
      ],

      // Portfolio theme injected at runtime (switches dev ↔ prod URL)
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: PORTFOLIO_THEME_URL,
          },
        },
      ],

      // Local CSS loaded *after* Starlight's built-in styles — overrides palette
      customCss: ['./src/styles/custom.css'],

    }),
  ],
});
      