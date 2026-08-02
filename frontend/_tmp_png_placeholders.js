const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'assets_shared/images');
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const names = [
  'ic_polaris.png',
  'ic_roundstar1.png',
  'ic_roundstar2.png',
  'ic_roundstar3.png',
  'ic_shapestar1.png',
  'ic_shapestar2.png',
  'ic_shapestar3.png',
  'ic_shapestar4.png',
  'ic_cluster1.png',
  'ic_cluster2.png',
  'ic_cluster3.png',
  'ic_cluster4.png',
  'ic_cluster5.png',
];

for (const name of names) {
  const out = path.join(dir, name);
  if (!fs.existsSync(out) || fs.statSync(out).size < 200) {
    // only write placeholder if missing or tiny stub
    if (!fs.existsSync(out)) {
      fs.writeFileSync(out, tinyPng);
      console.log('created', name);
    } else {
      console.log('keep existing', name, fs.statSync(out).size);
    }
  } else {
    console.log('keep existing', name, fs.statSync(out).size);
  }
}

// Ensure background.png exists
const bg = path.join(dir, 'background.png');
if (!fs.existsSync(bg)) {
  fs.writeFileSync(bg, tinyPng);
  console.log('created background.png placeholder');
} else {
  console.log('keep background.png', fs.statSync(bg).size);
}
