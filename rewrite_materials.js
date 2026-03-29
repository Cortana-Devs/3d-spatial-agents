const fs = require('fs');

const materialsImport = `import {
  appleWhiteMaterial,
  appleDarkMaterial,
  appleAluminumMaterial,
  appleSpaceGreyMaterial,
  appleAccentRed,
  appleAccentBlue,
  applePremiumWood,
  appleScreenMaterial,
  appleDeviceScreenOff,
  appleDeviceScreenOn,
  neonGlowBlue,
} from "./DonutMaterials";`;

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Insert the import if it's not there
  if (!content.includes('appleWhiteMaterial')) {
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, endOfLastImport + 1) + materialsImport + '\n' + content.slice(endOfLastImport + 1);
  }

  // Remove the old materials block ONLY from Props.tsx
  if (filepath.includes('Props.tsx')) {
    content = content.replace(/\/\/ --- MATERIALS ---[\s\S]*?(?=\/\/ --- FIRE EXTINGUISHER ---)/, '');
    
    // Convert defined variables usages
    content = content.replace(/plasticWhite/g, 'appleWhiteMaterial');
    content = content.replace(/plasticBlack/g, 'appleSpaceGreyMaterial');
    content = content.replace(/metalRed/g, 'appleAccentRed');
    content = content.replace(/paperBlue/g, 'appleAccentBlue');
    content = content.replace(/paperWhite/g, 'appleWhiteMaterial');
    content = content.replace(/paperRed/g, 'appleAccentRed');
  }

  // Common MeshStandardMaterial replacements
  const regexes = [
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#ffffff"[^}]*\}\)/g, 'appleWhiteMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#fff"[^}]*\}\)/g, 'appleWhiteMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#aaaaaa"[^}]*\}\)/g, 'appleAluminumMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#222"[^}]*\}\)/g, 'appleSpaceGreyMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#333"[^}]*\}\)/g, 'appleSpaceGreyMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#222222"[^}]*\}\)/g, 'appleSpaceGreyMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#111"[^}]*\}\)/g, 'appleDarkMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#111",\s*metalness:\s*0\.5\s*\}\)/g, 'appleDarkMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#000"[^}]*\}\)/g, 'appleDeviceScreenOff'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#4488ff"[^}]*\}\)/g, 'appleScreenMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#00ffff"[^}]*\}\)/g, 'appleAccentBlue'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#554433"[^}]*\}\)/g, 'applePremiumWood'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#443322"[^}]*\}\)/g, 'applePremiumWood'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#cc5500"[^}]*\}\)/g, 'appleAccentRed'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#228822"[^}]*\}\)/g, 'appleSpaceGreyMaterial'], // Flower pot plant
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#334455"[^}]*\}\)/g, 'appleAluminumMaterial'], // Sofa
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#2a2a2a"[^}]*\}\)/g, 'appleDarkMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#1a1a1a"[^}]*\}\)/g, 'appleDarkMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#777777"[^}]*\}\)/g, 'appleAluminumMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#888888"[^}]*\}\)/g, 'appleAluminumMaterial'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#555"[^}]*\}\)/g, 'appleAluminumMaterial'],
    
    // Furniture.tsx explicit colors
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#111"\s*\}\)/g, 'appleDarkMaterial'],
    [/new THREE\.MeshBasicMaterial\(\{\s*color:\s*"#00ffff"\s*\}\)/g, 'neonGlowBlue'],
    [/new THREE\.MeshStandardMaterial\(\{\s*color:\s*"#00ffff"[^}]*\}\)/g, 'appleAccentBlue'],
  ];

  for (const [regex, replacement] of regexes) {
    content = content.replace(regex, replacement);
  }

  fs.writeFileSync(filepath, content);
}

processFile('src/components/models/environment/Props.tsx');
processFile('src/components/models/environment/Furniture.tsx');

console.log('Props and Furniture optimized.');
