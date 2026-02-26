import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./public/icon.svg');

// 192x192
await sharp(svg).resize(192, 192).png().toFile('./public/icon-192.png');
console.log('icon-192.png generated');

// 512x512
await sharp(svg).resize(512, 512).png().toFile('./public/icon-512.png');
console.log('icon-512.png generated');

// maskable (with padding - safe zone is center 80%)
await sharp(svg).resize(512, 512).png().toFile('./public/icon-maskable.png');
console.log('icon-maskable.png generated');
