import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('two clients share state and duplicate requests do not mutate it twice',async()=>{
  const port=19000+Math.floor(Math.random()*10000);
  const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  try {
    await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Server exited before listening');}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Startup timeout')),5000).unref())]);
    const base=`http://127.0.0.1:${port}`;
    async function post(path,data,token){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});}
    const a=await(await post('/rooms',{name:'A'})).json();
    const b=await(await post(`/rooms/${a.room}/join`,{name:'B'})).json();
    assert.equal((await fetch(`${base}/rooms/${a.room}`)).status,401);
    assert.equal((await post(`/rooms/${a.room}/commands`,{requestId:'bad-turn',action:'roll'},b.token)).status,400);
    const payload={requestId:'first-roll',action:'roll'};
    const first=await(await post(`/rooms/${a.room}/commands`,payload,a.token)).json();
    const second=await(await post(`/rooms/${a.room}/commands`,payload,a.token)).json();
    assert.deepEqual(second,first);
    const other=await(await fetch(`${base}/rooms/${a.room}`,{headers:{Authorization:`Bearer ${b.token}`}})).json();
    assert.deepEqual(other,first);assert.equal(other.players[0].id,undefined);
    assert.equal((await post(`/rooms/${a.room}/commands`,{...payload,action:'buy'},a.token)).status,400);
    assert.equal((await post(`/rooms/${a.room}/join`,{name:'C'})).status,400);
  } finally {if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}}
});
