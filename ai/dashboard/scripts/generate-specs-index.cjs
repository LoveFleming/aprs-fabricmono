// Build-time script: scans specs/ directory and generates public/data/specs-index.json
// Usage: node scripts/generate-specs-index.js

const fs = require('fs');
const path = require('path');

const SPECS_DIR = fs.existsSync(path.resolve(__dirname, '../../../specs'))
  ? path.resolve(__dirname, '../../../specs')  // local dev
  : path.resolve(__dirname, '../specs');          // Vercel build (copied)
const OUTPUT = path.resolve(__dirname, '../public/data/specs-index.json');

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function buildIndex() {
  const files = walkDir(SPECS_DIR);
  const specsRoot = SPECS_DIR;
  const index = [];

  for (const file of files) {
    const rel = path.relative(specsRoot, file).replace(/\\/g, '/');
    const ext = path.extname(file);
    const parts = rel.split('/');
    const contractType = parts[0];
    const fileName = path.basename(file);

    if (ext === '.json') {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        index.push({
          type: contractType,
          path: rel,
          fileName,
          format: 'json',
          name: fileName.replace(/\.json$/, ''),
          data: content,
        });
      } catch (e) {
        // skip invalid JSON
      }
    } else if (ext === '.md') {
        const content = fs.readFileSync(file, 'utf8');
        index.push({
            type: contractType,
            path: rel,
            fileName,
            format: 'markdown',
            name: fileName.replace(/\.md$/, ''),
            preview: content.slice(0, 500),
        });
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2));
  console.log('Generated specs-index.json with ' + index.length + ' entries');
}

buildIndex();
