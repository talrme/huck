const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||5190);
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let pathname=decodeURIComponent(url.pathname).replace(/^\/huck(?=\/|$)/,'')||'/';
  let file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.md':'text/plain'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Huck: http://127.0.0.1:${port}/`));
