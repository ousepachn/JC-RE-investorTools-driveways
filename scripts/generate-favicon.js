const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'icon.svg'));
  
  // Generate PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(process.cwd(), 'app', 'icon.png'));

  // Generate favicon.ico (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .toFormat('png')
    .toFile(path.join(process.cwd(), 'app', 'favicon.ico'));

  console.log('Icons generated successfully in app directory!');
}

generateIcons().catch(console.error); 