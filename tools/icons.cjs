const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const icon=fs.readFileSync(path.join(root,'shared/pacifier.svg'),'utf8').replace(/stroke="currentColor"/,'stroke="#23634f"');
const art=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#e1f0e8"/><g transform="translate(82 62) scale(14.5)">${icon.replace(/<svg[^>]*>/,'<g fill="none" stroke="#23634f" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">').replace('</svg>','</g>')}</g></svg>`);
(async()=>{for(const [name,size] of [['app-icon.png',512],['app-icon-192.png',192],['apple-touch-icon.png',180],['favicon.png',32]])await sharp(art).resize(size,size).png().toFile(path.join(root,'shared',name));console.log('Built pacifier app icons at 512/192/180/32px');})();
