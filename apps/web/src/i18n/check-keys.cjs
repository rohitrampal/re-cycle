const fs = require('fs');
const path = require('path');

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (obj[k] !== null && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      keys = keys.concat(getAllKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const dir = __dirname + '/locales';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const keySets = {};
let ref;
let refKeys;

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const keys = getAllKeys(data);
  keySets[f] = new Set(keys);
  if (f === 'en.json') {
    ref = keySets[f];
    refKeys = keys.sort();
  }
}

if (!ref) {
  ref = keySets[Object.keys(keySets)[0]];
  refKeys = [...ref].sort();
}

console.log('Reference (en.json) key count:', refKeys.length);
console.log('');

let hasErrors = false;
for (const f of files.sort()) {
  const set = keySets[f];
  const missing = refKeys.filter((k) => !set.has(k));
  const extra = [...set].filter((k) => !ref.has(k));
  if (missing.length || extra.length) {
    hasErrors = true;
    console.log(f + ':');
    if (missing.length) {
      console.log('  MISSING (' + missing.length + '):', missing.slice(0, 20).join(', ') + (missing.length > 20 ? '...' : ''));
    }
    if (extra.length) {
      console.log('  EXTRA (' + extra.length + '):', extra.slice(0, 10).join(', ') + (extra.length > 10 ? '...' : ''));
    }
    console.log('');
  } else {
    console.log(f + ': OK (' + set.size + ' keys)');
  }
}

process.exit(hasErrors ? 1 : 0);
