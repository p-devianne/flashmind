const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Include iOS-specific sizes: 167 (iPad Pro), 180 (iPhone)
const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// iOS splash screen sizes (width x height)
const splashScreens = [
    { width: 1170, height: 2532, name: 'splash-1170x2532' }, // iPhone 12/13/14
    { width: 1284, height: 2778, name: 'splash-1284x2778' }, // iPhone 12/13/14 Pro Max
    { width: 1179, height: 2556, name: 'splash-1179x2556' }, // iPhone 14 Pro
    { width: 1290, height: 2796, name: 'splash-1290x2796' }, // iPhone 14 Pro Max / 15 Pro Max
];

const iconsDir = path.join(__dirname, '..', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawIcon(ctx, size) {
    const scale = size / 512;
    
    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, '#818cf8');
    bgGrad.addColorStop(1, '#6366f1');
    
    // Rounded rectangle background
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 0, 0, size, size, 96 * scale);
    ctx.fill();
    
    // Card gradient
    const cardGrad = ctx.createLinearGradient(0, 0, size, size);
    cardGrad.addColorStop(0, '#4f46e5');
    cardGrad.addColorStop(1, '#4338ca');
    
    // Back card shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, 120 * scale, 130 * scale, 280 * scale, 200 * scale, 20 * scale);
    ctx.fill();
    
    // Back card
    ctx.fillStyle = cardGrad;
    roundRect(ctx, 140 * scale, 110 * scale, 280 * scale, 200 * scale, 20 * scale);
    ctx.fill();
    
    // Front card
    ctx.fillStyle = 'white';
    roundRect(ctx, 92 * scale, 170 * scale, 280 * scale, 200 * scale, 20 * scale);
    ctx.fill();
    
    // Card lines
    ctx.fillStyle = '#e0e7ff';
    roundRect(ctx, 132 * scale, 220 * scale, 160 * scale, 12 * scale, 6 * scale);
    ctx.fill();
    roundRect(ctx, 132 * scale, 252 * scale, 200 * scale, 12 * scale, 6 * scale);
    ctx.fill();
    roundRect(ctx, 132 * scale, 284 * scale, 120 * scale, 12 * scale, 6 * scale);
    ctx.fill();
    
    // Plus button circle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(400 * scale, 400 * scale, 56 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Plus icon
    ctx.fillStyle = '#6366f1';
    roundRect(ctx, 390 * scale, 364 * scale, 20 * scale, 72 * scale, 10 * scale);
    ctx.fill();
    roundRect(ctx, 364 * scale, 390 * scale, 72 * scale, 20 * scale, 10 * scale);
    ctx.fill();
}

// Generate icons
sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    drawIcon(ctx, size);
    
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(filename, buffer);
    
    console.log(`Generated: icon-${size}.png`);
});

// Generate splash screens for iOS
splashScreens.forEach(({ width, height, name }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient matching the app
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#818cf8');
    bgGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Draw centered icon (about 30% of the smaller dimension)
    const iconSize = Math.min(width, height) * 0.3;
    const offsetX = (width - iconSize) / 2;
    const offsetY = (height - iconSize) / 2;
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    drawIconContent(ctx, iconSize);
    ctx.restore();
    
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `${name}.png`);
    fs.writeFileSync(filename, buffer);
    
    console.log(`Generated: ${name}.png`);
});

// Draw just the icon content (cards) without background - for splash screens
function drawIconContent(ctx, size) {
    const scale = size / 512;
    
    // Card gradient
    const cardGrad = ctx.createLinearGradient(0, 0, size, size);
    cardGrad.addColorStop(0, '#4f46e5');
    cardGrad.addColorStop(1, '#4338ca');
    
    // Back card shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, 120 * scale, 130 * scale, 280 * scale, 200 * scale, 20 * scale);
    ctx.fill();
    
    // Back card
    ctx.fillStyle = cardGrad;
    roundRect(ctx, 140 * scale, 110 * scale, 280 * scale, 200 * scale, 20 * scale);
    ctx.fill();
    
    // Front card
    ctx.fillStyle = 'white';
    roundRect(ctx, 92 * scale, 170 * scale, 280 * scale, 200 * scale, 20 * scale);
    ctx.fill();
    
    // Card lines
    ctx.fillStyle = '#e0e7ff';
    roundRect(ctx, 132 * scale, 220 * scale, 160 * scale, 12 * scale, 6 * scale);
    ctx.fill();
    roundRect(ctx, 132 * scale, 252 * scale, 200 * scale, 12 * scale, 6 * scale);
    ctx.fill();
    roundRect(ctx, 132 * scale, 284 * scale, 120 * scale, 12 * scale, 6 * scale);
    ctx.fill();
}

console.log('All icons generated successfully!');
