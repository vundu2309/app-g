import http from 'node:http';
import os from 'node:os';
import {createRoom,join,view,command,GameError} from './game.mjs';

const rooms=new Map(), requests=new Map();
const PORT=Number(process.env.PORT||8787);
function send(res,status,data) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req) {let raw='';for await(const part of req){raw+=part;if(raw.length>4096)throw new GameError('Yeu cau qua lon.');}try{return JSON.parse(raw||'{}');}catch{throw new GameError('JSON khong hop le.');}}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,rooms:rooms.size});
    if(req.method==='POST'&&url.pathname==='/rooms') {
      if(rooms.size>=100)throw new GameError('May chu da du phong. Hay khoi dong lai khi khong con van dang choi.');
      const data=await body(req);const r=createRoom(data.name);while(rooms.has(r.id))r.id=createRoom().id;rooms.set(r.id,r);requests.set(r.id,new Map());return send(res,201,{room:r.id,token:r.players[0].id,player:0});
    }
    const match=url.pathname.match(/^\/rooms\/([A-Z0-9]+)(?:\/(join|commands))?$/);if(!match)return send(res,404,{error:'Khong tim thay.'});
    const r=rooms.get(match[1]);if(!r)return send(res,404,{error:'Khong tim thay phong.'});
    if(req.method==='POST'&&match[2]==='join'){const data=await body(req);const p=join(r,data.name);return send(res,200,{room:r.id,token:p.id,player:r.players.length-1});}
    const token=req.headers.authorization?.replace(/^Bearer /,'');if(!r.players.some(p=>p.id===token))return send(res,401,{error:'Can ma nguoi choi.'});
    if(req.method==='GET'&&!match[2])return send(res,200,view(r));
    if(req.method==='POST'&&match[2]==='commands') {
      const data=await body(req);if(typeof data.requestId!=='string'||!data.requestId||data.requestId.length>80)throw new GameError('Can requestId.');
      const cache=requests.get(r.id), key=`${token}:${data.requestId}`, fingerprint=JSON.stringify([data.action,data.value]);
      if(cache.has(key)){const previous=cache.get(key);if(previous!==fingerprint)throw new GameError('requestId da duoc dung.');return send(res,200,view(r));}
      command(r,token,data.action,data.value);cache.set(key,fingerprint);return send(res,200,view(r));
    }
    send(res,405,{error:'Phuong thuc khong ho tro.'});
  }catch(err){send(res,err instanceof GameError?400:500,{error:err instanceof GameError?err.message:'Loi may chu.'});}
});
server.requestTimeout=10000;
server.listen(PORT,'0.0.0.0',()=>{
  console.log(`City Tycoon LAN: http://localhost:${PORT}`);
  for(const nets of Object.values(os.networkInterfaces()))for(const n of nets||[])if(n.family==='IPv4'&&!n.internal)console.log(`Dia chi cho dien thoai: http://${n.address}:${PORT}`);
  console.log('Chi dung tren Wi-Fi tin cay. Trang thai hien luu trong RAM; tat may chu se mat van.');
});
