import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createPreviewServer} from '../server.mjs';

test('preview rejects malformed and escaping paths and continues serving valid requests', async () => {
 const server=createPreviewServer(fileURLToPath(new URL('../dist/',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const request=(path,method='GET')=>new Promise((resolve,reject)=>{
  http.request({host:'127.0.0.1',port:server.address().port,path,method},res=>{
   let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
  }).on('error',reject).end();
 });
 try {
  for(const path of ['/%','/%E0%A4%A','/%00']) assert.equal((await request(path)).status,400);
  for(const path of ['/%2e%2e%2fconfig.json','/%2e%2e%5cconfig.json']) assert.ok([403,404].includes((await request(path)).status));
  assert.equal((await request('/','POST')).status,405);
  const valid=await request('/');assert.equal(valid.status,200);assert.match(valid.body,/<title>/);assert.equal(valid.headers['x-content-type-options'],'nosniff');
  assert.equal((await request('/','HEAD')).body,'');
 } finally {await new Promise(resolve=>server.close(resolve));}
});
