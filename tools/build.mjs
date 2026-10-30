import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
fs.copyFileSync(path.join(root,'tools/page.html'),path.join(root,'index.html'));
fs.writeFileSync(path.join(root,'manifest.webmanifest'),JSON.stringify({
  id:'./',name:'Huck',short_name:'Huck',start_url:'./',scope:'./',display:'standalone',
  background_color:'#f7f9fb',theme_color:'#596cc1',icons:[
    {src:'shared/app-icon.png?v=20261030-pacifier',sizes:'512x512',type:'image/png'},
    {src:'shared/app-icon-192.png?v=20261030-pacifier',sizes:'192x192',type:'image/png'}
  ]
},null,2));
fs.writeFileSync(path.join(root,'backend.sample.gs'),fs.readFileSync(path.join(root,'shared/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'tools/backend-tail.gs'),'utf8'));
console.log('Built Huck production app, root manifest, and standalone Apps Script.');
