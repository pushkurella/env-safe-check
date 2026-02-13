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
  src = src.replace(/(from\s+|import\()(["'])(\.\/[^"'\)]+?)\2/g, (m, p1, q, p2) => {
    if (/\.[a-zA-Z0-9]+$/.test(p2)) return m;
    return `${p1}${q}${p2}.js${q}`;
  });
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
