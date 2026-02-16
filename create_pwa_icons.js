const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'front', 'public', 'favicon.ico');
const dest1 = path.join(__dirname, 'front', 'public', 'pwa-192x192.png');
const dest2 = path.join(__dirname, 'front', 'public', 'pwa-512x512.png');

try {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest1);
        fs.copyFileSync(src, dest2);
    } else {
        console.error('❌ favicon.ico not found!');
    }
} catch (error) {
    console.error('❌ Error creating PWA icons:', error);
}
