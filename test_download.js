const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const app = { getPath: () => os.homedir() }; // mock app
const artistName = 'Ado';
const url = 'https://cdn-images.dzcdn.net/images/artist/858e14d0f8ee062253851aaf3b31daef/1000x1000-000000-80-0-0.jpg';

const downloadImage = async (url, artistName) => {
  try {
    const artistDir = path.join(app.getPath('userData'), 'artist_images');
    console.log('mkdir', artistDir);
    await fs.mkdir(artistDir, { recursive: true });
    const safeName = artistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    let ext = '.jpg';
    try {
        ext = path.extname(new URL(url).pathname) || '.jpg';
    } catch(e) {}
    const filePath = path.join(artistDir, `${safeName}${ext}`);
    
    console.log('fetching url', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed ' + res.status);
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));
    console.log('file saved to', filePath);
    return `file:///${filePath.replace(/\\/g, '/')}`;
  } catch (e) {
    console.error('Error in downloadImage:', e);
    return url;
  }
};

downloadImage(url, artistName).then(console.log);
