/**
 * docfx-to-starlight.mjs
 *
 * Converts DocFX metadata YAML files into Starlight-compatible MDX pages.
 *
 * Usage:
 *   node scripts/docfx-to-starlight.mjs
 *
 * Input:  docfx-metadata/  (at the repo root — copy here manually after running
 *                           `docfx metadata docfx.json` in the Unity project)
 *
 * Output: src/content/docs/api/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT  = path.resolve(__dirname, '..');
const META_DIR   = path.resolve(DOCS_ROOT, 'docfx-metadata');
const OUTPUT_DIR = path.resolve(DOCS_ROOT, 'src', 'content', 'docs', 'api');

// ── Helpers ───────────────────────────────────────────────────────────────

/** Very small YAML parser — handles only the DocFX metadata subset we need. */
async function parseDocFxYaml(raw) {
  try {
    // Dynamically import js-yaml if available
    const yaml = await import('js-yaml').catch(() => null);
    if (yaml) return yaml.default.load(raw);
  } catch {/* fall through to manual parse */}

  // Minimal fallback parser for key: value and lists
  const lines = raw.split('\n');
  const result = {};
  let currentKey = null;
  let inList = false;
  for (const line of lines) {
    if (line.startsWith('### ') || line.startsWith('#')) continue;
    const kvMatch = line.match(/^(\w[\w.]*)\s*:\s*(.*)/);
    if (kvMatch && !line.startsWith('  ')) {
      currentKey = kvMatch[1];
      result[currentKey] = kvMatch[2].trim() || null;
      inList = false;
      continue;
    }
    if (line.match(/^- /) && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      result[currentKey].push(line.replace(/^- /, '').trim());
      inList = true;
    }
  }
  return result;
}

/** Strip HTML tags from DocFX summary strings. */
function stripHtml(str = '') {
  return str.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

/** Convert a DocFX uid to a URL-friendly slug. */
function uidToSlug(uid = '') {
  return uid
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Render one DocFX item (class, interface, method, property…) as Markdown. */
function renderItem(item, allItems) {
  if (!item) return '';
  const lines = [];

  const type = item.type ?? 'Member';
  const summary = stripHtml(item.summary ?? '');
  const syntax = item.syntax?.content ?? item.syntax?.['content.csharp'] ?? '';
  const ns = item.namespace ?? '';
  const assembly = item.assemblies?.[0] ?? '';

  // Meta table
  if (ns) lines.push(`**Namespace:** \`${ns}\`  `);
  if (assembly) lines.push(`**Assembly:** \`${assembly}\`  `);
  if (type !== 'Member') lines.push(`**Type:** ${type}  `);
  lines.push('');

  // Summary
  if (summary) {
    lines.push(summary);
    lines.push('');
  }

  // Syntax block
  if (syntax) {
    lines.push('```csharp');
    lines.push(syntax);
    lines.push('```');
    lines.push('');
  }

  // Children (methods, properties, events)
  const children = Array.isArray(item.children) ? item.children : [];
  const childItems = children
    .map(uid => allItems.find(i => i.uid === uid))
    .filter(Boolean);

  if (childItems.length > 0) {
    const grouped = {};
    for (const child of childItems) {
      const t = child.type ?? 'Member';
      (grouped[t] ??= []).push(child);
    }

    for (const [groupType, groupItems] of Object.entries(grouped)) {
      lines.push(`## ${groupType}s`);
      lines.push('');
      for (const child of groupItems) {
        const childSyntax = child.syntax?.content ?? child.syntax?.['content.csharp'] ?? '';
        const childSummary = stripHtml(child.summary ?? '');
        lines.push(`### \`${child.name ?? child.id}\``);
        lines.push('');
        if (childSummary) { lines.push(childSummary); lines.push(''); }
        if (childSyntax) {
          lines.push('```csharp');
          lines.push(childSyntax);
          lines.push('```');
          lines.push('');
        }
        // Parameters
        const params = Array.isArray(child.syntax?.parameters) ? child.syntax.parameters : [];
        if (params.length > 0) {
          lines.push('**Parameters**');
          lines.push('');
          lines.push('| Name | Type | Description |');
          lines.push('|---|---|---|');
          for (const p of params) {
            lines.push(`| \`${p.id ?? ''}\` | \`${p.type ?? ''}\` | ${stripHtml(p.description ?? '')} |`);
          }
          lines.push('');
        }
        // Returns
        const returns = child.syntax?.return;
        if (returns?.description) {
          lines.push(`**Returns:** ${stripHtml(returns.description)}  `);
          lines.push('');
        }
      }
    }
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(META_DIR)) {
    console.error(`\n[docfx-to-starlight] Metadata directory not found: ${META_DIR}`);
    console.error('Run `docfx metadata docfx.json` from the Unity project root first.\n');
    process.exit(1);
  }

  const ymlFiles = fs.readdirSync(META_DIR).filter(f => f.endsWith('.yml') && f !== 'toc.yml');
  if (ymlFiles.length === 0) {
    console.warn('[docfx-to-starlight] No YAML files found in', META_DIR);
    return;
  }

  // 1. Gather ALL items for cross-reference
  const allItems = [];
  const parsedFiles = new Map();

  for (const file of ymlFiles) {
    const raw = fs.readFileSync(path.join(META_DIR, file), 'utf8');
    const data = await parseDocFxYaml(raw);
    if (data?.items) {
      allItems.push(...data.items);
      parsedFiles.set(file, data);
    }
  }

  // Ensure output directory exists (keep existing index.mdx)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let generated = 0;
  for (const [file, data] of parsedFiles) {
    // Skip if not a ManagedReference YAML
    const raw = fs.readFileSync(path.join(META_DIR, file), 'utf8');
    if (!raw.includes('YamlMime:ManagedReference')) continue;

    const items = data.items || [];
    const primary = items[0];
    if (!primary?.uid || primary.type === 'Namespace') continue; // Namespaces handled differently or skipped

    const title = primary.name ?? primary.uid;
    const description = stripHtml(primary.summary ?? `${primary.type ?? 'Type'} documentation`);
    const slug = uidToSlug(primary.uid);
    const body = renderItem(primary, allItems); // Use allItems for cross-file children lookup if needed

    const mdx = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"').slice(0, 200)}"
sidebar:
  label: "${title.replace(/"/g, '\\"')}"
---

${body}
`;

    const outFile = path.join(OUTPUT_DIR, `${slug}.mdx`);
    fs.writeFileSync(outFile, mdx, 'utf8');
    generated++;
    console.log(`[docfx-to-starlight] ✓ ${outFile.replace(DOCS_ROOT, '')}`);
  }

  console.log(`\n[docfx-to-starlight] Done — ${generated} page(s) generated in ${OUTPUT_DIR.replace(DOCS_ROOT, 'docs/')}\n`);
}

main().catch(err => {
  console.error('[docfx-to-starlight] Error:', err);
  process.exit(1);
});;