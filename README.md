# DOC-Unity-InteractionSystem

Deployed at: **https://Superkorlas.github.io/Unity-InteractionSystem/**

---

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [DocFX](https://dotnet.github.io/docfx/) (optional — only needed to regenerate API docs from C# source)
  - Requires [.NET SDK](https://dotnet.microsoft.com/download) 6+
  - Install: `dotnet tool install -g docfx`

---

## Local development

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:4321/Unity-InteractionSystem/`.

> The theme is loaded at runtime from the portfolio site (`http://localhost:4321/about-me/theme.css`).
> If the portfolio isn't running locally, the fallback palette defined in `src/styles/custom.css` is used instead — the site looks correct either way.

---

## Updating the API docs

The API reference pages live in `src/content/docs/api/`. They can be updated manually or regenerated from the C# XML documentation comments using DocFX.

### Step 1 — Generate DocFX metadata

From the root of the C# project (wherever `docfx.json` is located):

```bash
docfx metadata docfx.json
```

This produces a `docfx-metadata/` folder with YAML files.

### Step 2 — Copy the metadata to this repo

Copy the entire `docfx-metadata/` folder into the root of this repo:

```
DOC-Unity-InteractionSystem/
└── docfx-metadata/       ← paste here
    ├── FireSoftworks.Interaction.yml
    ├── toc.yml
    └── ...
```

> `docfx-metadata/` is listed in `.gitignore` — it will not be committed.

### Step 3 — Convert metadata to MDX pages

```bash
node scripts/docfx-to-starlight.mjs
```

This overwrites the files in `src/content/docs/api/` with freshly generated MDX pages.

### Step 4 — Preview and verify

```bash
npm run dev
```

Open `http://localhost:4321/Unity-InteractionSystem/api/` and check the updated pages.

---

## Production build

```bash
npm run build
```

Output is written to `dist/`. This is what GitHub Actions deploys to GitHub Pages.

---

## Deployment (GitHub Actions)

Deployment is automatic — pushing to `master` triggers the workflow in `.github/workflows/docs.yml`, which installs dependencies, builds the Astro site, and deploys `dist/` to GitHub Pages.

To enable GitHub Pages for the first time: **Settings → Pages → Source → GitHub Actions**.

---

## Project structure

```
DOC-Unity-InteractionSystem/
├── src/
│   ├── content/
│   │   └── docs/
│   │       ├── index.mdx          # Landing page
│   │       ├── quick-start.mdx    # Quick Start guide
│   │       ├── guides/            # Topic guides
│   │       │   ├── actions.mdx
│   │       │   ├── events.mdx
│   │       │   └── extending.mdx
│   │       └── api/               # API reference (one file per type)
│   └── styles/
│       └── custom.css             # Theme overrides (CSS variables)
├── scripts/
│   └── docfx-to-starlight.mjs    # DocFX YAML → Starlight MDX converter
├── docfx-metadata/                # (gitignored) DocFX output — copy here manually
├── astro.config.mjs
├── package.json
└── tsconfig.json
```
