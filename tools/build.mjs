import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
fs.copyFileSync(path.join(root,'tools/page.html'),path.join(root,'index.html'));
const staging=path.join(root,'staging/firebase');fs.mkdirSync(staging,{recursive:true});
const stagingPage=fs.readFileSync(path.join(root,'tools/page.html'),'utf8').replaceAll('src="shared/','src="../../shared/').replaceAll('href="shared/','href="../../shared/').replace('<title>Huck</title>','<title>Huck · Firestore staging</title>');
fs.writeFileSync(path.join(staging,'index.html'),stagingPage);
fs.writeFileSync(path.join(staging,'manifest.webmanifest'),JSON.stringify({id:'./',name:'Huck Firebase Test',short_name:'Huck Test',start_url:'./',scope:'./',display:'standalone',background_color:'#f7f9fb',theme_color:'#596cc1',icons:[{src:'../../shared/app-icon.png?v=20261103-koala',sizes:'512x512',type:'image/png'},{src:'../../shared/app-icon-192.png?v=20261103-koala',sizes:'192x192',type:'image/png'}]},null,2));
fs.writeFileSync(path.join(root,'manifest.webmanifest'),JSON.stringify({
  id:'./',name:'Huck',short_name:'Huck',start_url:'./',scope:'./',display:'standalone',
  background_color:'#f7f9fb',theme_color:'#596cc1',icons:[
    {src:'shared/app-icon.png?v=20261103-koala',sizes:'512x512',type:'image/png'},
    {src:'shared/app-icon-192.png?v=20261103-koala',sizes:'192x192',type:'image/png'}
  ]
},null,2));
fs.writeFileSync(path.join(root,'backend.sample.gs'),fs.readFileSync(path.join(root,'shared/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'tools/backend-tail.gs'),'utf8'));
console.log('Built Huck production app, root manifest, and standalone Apps Script.');
