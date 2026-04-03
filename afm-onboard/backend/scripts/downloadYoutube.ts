import { mkdirSync } from 'fs';
import { join } from 'path';
import ytdl from 'ytdl-core';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: ts-node scripts/downloadYoutube.ts <youtube_url> [filename.mp4]');
    process.exit(1);
  }
  const filename = process.argv[3] || 'training-video.mp4';
  const dir = join(process.cwd(), 'uploads');
  mkdirSync(dir, { recursive: true });
  const out = join(dir, filename);

  console.log('Downloading to', out);
  try {
    const stream = ytdl(url, { quality: '18', filter: 'audioandvideo' });
    await new Promise<void>((resolve, reject) => {
      const fs = require('fs');
      const write = fs.createWriteStream(out);
      stream.pipe(write);
      stream.on('error', reject);
      write.on('finish', () => resolve());
      write.on('error', reject);
    });
  } catch (e) {
    console.warn('ytdl failed, trying audio-only fallback...');
    const audioOut = out.replace(/\.mp4$/i, '.mp3');
    const stream = ytdl(url, { quality: 'highestaudio' });
    await new Promise<void>((resolve, reject) => {
      const fs = require('fs');
      const write = fs.createWriteStream(audioOut);
      stream.pipe(write);
      stream.on('error', reject);
      write.on('finish', () => resolve());
      write.on('error', reject);
    });
    console.log('Saved audio fallback:', audioOut);
  }

  console.log('Saved:', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


