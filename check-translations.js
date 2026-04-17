const fs = require('fs');
const path = require('path');

function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      return Object.assign(acc, flattenObject(obj[key], `${pre}${key}`));
    } else {
      return Object.assign(acc, { [`${pre}${key}`]: obj[key] });
    }
  }, {});
}

const locales = ['en', 'hi', 'bn'];
const basePath = path.join(__dirname, 'messages');
const translations = {};

locales.forEach(locale => {
  const filePath = path.join(basePath, `${locale}.json`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    translations[locale] = flattenObject(JSON.parse(content));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    process.exit(1);
  }
});

const enKeys = new Set(Object.keys(translations.en));
const missing = {};

locales.slice(1).forEach(locale => {
  const missingKeys = [...enKeys].filter(key => !(key in translations[locale]));
  if (missingKeys.length > 0) {
    missing[locale] = missingKeys;
  }
});

if (Object.keys(missing).length > 0) {
  console.log('Translation missing keys:');
  for (const locale in missing) {
    console.log(`\n${locale.toUpperCase()} (${missing[locale].length} missing):`);
    missing[locale].forEach(key => console.log(`  - ${key}`));
  }
  process.exit(1);
} else {
  console.log('All translations are complete.');
  process.exit(0);
}