import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function createPreviewServer(directory = 'dist') {
 const root = resolve(directory);
 return http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}).end(); return; }
  let path;
  try {
   const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
   if (pathname.includes('\0')) throw new Error('Invalid path');
   path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  } catch { res.writeHead(400).end('Bad request'); return; }
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
   const [resolvedRoot, resolvedPath] = await Promise.all([realpath(root), realpath(path)]);
   if (!resolvedPath.startsWith(resolvedRoot + sep)) { res.writeHead(403).end(); return; }
   const file = await readFile(resolvedPath);
   res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'})[extname(path)] || 'application/octet-stream');
   res.setHeader('Cache-Control','no-store');
   res.end(req.method === 'HEAD' ? undefined : file);
  } catch { res.writeHead(404).end('Not found'); }
 });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 createPreviewServer().listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
}
