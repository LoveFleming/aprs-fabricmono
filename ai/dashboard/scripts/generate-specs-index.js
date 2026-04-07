// Build-time script: scans specs/ directory and generates public/data/specs-index.json
// Run: node scripts/generate-specs-index.js
// This index is fetched at runtime by the dashboard

const fs = require('fs');
const path = require('path');

const SPECS_DIR = path.resolve(__dirname, '../../specs');
const OUTPUT = path.resolve(__dirname, '../public/data/specs-index.json');

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function buildIndex() {
  const files = walk(SPECS_DIR);
  const specsRoot = SPECS_DIR;
  const index = [];

  for (const file of files) {
    const rel = path.relative(specsRoot, file); // e.g. "api-contracts/material/api-lot-tool-material-check.json"
    const ext = path.extname(file);
    const parts = rel.split(path.sep);
    const contractType = parts[0]; // "api-contracts", "node-contracts", etc.

    // For files in material/ subdirectory
    const fileName = path.basename(file);
    const dir = parts.slice(0, -1).join('/');

    if (ext === '.json') {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        index.push({
          type: contractType,
          path: rel,
          dir,
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
        dir,
        fileName,
        format: 'markdown',
        name: fileName.replace(/\.md$/, ''),
        preview: content.slice(0, 200),
      });
    }
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2));
  console.log(`✅ Generated specs-index.json with ${index.length} entries`);
}

buildIndex();
