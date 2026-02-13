const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.js')) patchFile(full);
  }
}

function patchFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  // Replace import/export specifiers that are relative and have no extension
  // Examples: import {x} from "./foo"  -> ./foo.js
  //          export * from './bar'    -> ./bar.js
  src = src.replace(/(from\s+|import\()(["'])(\.\/[^"'\)]+?)\2/g, (m, p1, q, p2) => {
    // p2 is like ./module or ../module/sub
    // If it already ends with an extension, leave it
    if (/\.[a-zA-Z0-9]+$/.test(p2)) return m;
    return `${p1}${q}${p2}.js${q}`;
  });
  // also handle export ... from '...'
  src = src.replace(/(export\s+[^;]*?from\s+)(["'])(\.\/[^"']+?)\2/g, (m, p1, q, p2) => {
    if (/\.[a-zA-Z0-9]+$/.test(p2)) return m;
    return `${p1}${q}${p2}.js${q}`;
  });
  fs.writeFileSync(file, src, 'utf8');
}

const dist = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist directory not found; run tsc first');
  process.exit(1);
}
walk(dist);
console.log('Patched imports to include .js extensions in', dist);
