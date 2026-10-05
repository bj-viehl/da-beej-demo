/* eslint-disable no-console */
/*
 * Fails when a stylesheet uses a custom property that is not declared anywhere.
 * (A misspelled or removed token makes the declaration silently invalid at runtime.)
 * Custom properties set from JavaScript with style.setProperty('--name', ...) count as declared.
 */
const fs = require('fs');
const path = require('path');

function files(dir, extension) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full, extension);
    return full.endsWith(extension) ? [full] : [];
  });
}

const css = [...files('styles', '.css'), ...files('blocks', '.css')];
const js = [...files('scripts', '.js'), ...files('blocks', '.js')];

const declared = new Set();
const used = new Map();

css.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  [...source.matchAll(/(--[a-z0-9-]+)\s*:/gi)].forEach((m) => declared.add(m[1]));
  [...source.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].forEach((m) => {
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(file);
  });
});

js.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8');
  [...source.matchAll(/setProperty\(\s*['"`](--[a-z0-9-]+)/gi)].forEach((m) => declared.add(m[1]));
});

const undeclared = [...used.keys()].filter((name) => !declared.has(name)).sort();
if (undeclared.length) {
  console.error('Custom properties used but never declared:');
  undeclared.forEach((name) => console.error(`  ${name}  (${[...used.get(name)].join(', ')})`));
  process.exit(1);
}
console.log(`tokens ok: ${used.size} custom properties used, all declared`);
