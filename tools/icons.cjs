const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const art=fs.readFileSync(path.join(root,'shared/koala-pacifier-original.png'));
(async()=>{for(const [name,size] of [['app-icon.png',512],['app-icon-192.png',192],['apple-touch-icon.png',180],['favicon.png',32]])await sharp(art).trim().resize(size-8,size-8,{fit:'contain',background:'#e1f0e8'}).extend({top:4,bottom:4,left:4,right:4,background:'#e1f0e8'}).flatten({background:'#e1f0e8'}).png().toFile(path.join(root,'shared',name));console.log('Built koala app icons at 512/192/180/32px');})();
