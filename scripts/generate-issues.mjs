import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const issuePattern = /^(\d{2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.html$/i;
const labels = { allplus: 'ALL PLUS', live: 'LIVE' };
const ignoredDirectories = new Set(['.git', '.github', 'scripts', 'node_modules']);

function labelFor(folder) {
  return labels[folder.toLowerCase()] || folder
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

const entries = await readdir(root, { withFileTypes: true });
const magazines = [];

for (const entry of entries) {
  if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
  const folder = join(root, entry.name);
  const files = await readdir(folder, { withFileTypes: true });
  const issues = files
    .filter(file => file.isFile() && issuePattern.test(file.name))
    .map(file => {
      const [, shortYear, month] = file.name.match(issuePattern);
      return {
        code: `${shortYear}${month.toLowerCase()}`,
        year: 2000 + Number(shortYear),
        month: month.toLowerCase(),
        path: relative(root, join(folder, file.name)).split('\\').join('/')
      };
    })
    .sort((a, b) => a.year - b.year || a.month.localeCompare(b.month));

  if (issues.length) magazines.push({ id: entry.name, label: labelFor(entry.name), issues });
}

magazines.sort((a, b) => a.label.localeCompare(b.label));
await writeFile(join(root, 'issues.json'), `${JSON.stringify({ magazines }, null, 2)}\n`);
console.log(`Updated issues.json: ${magazines.length} magazine(s), ${magazines.reduce((total, magazine) => total + magazine.issues.length, 0)} issue file(s).`);
