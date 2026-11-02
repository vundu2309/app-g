import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,join,command,view} from './game.mjs';

function setup(){const r=createRoom('A');join(r,'B');return r;}
const roll=(r,a,b)=>{let i=0;command(r,r.players[r.turn].id,'roll',null,()=>[a,b][i++]);};

test('two players only, public state does not reveal credentials',()=>{
  const r=setup();assert.throws(()=>join(r,'C'));assert.equal(view(r).players[0].id,undefined);assert.equal(view(r).board.length,40);
});
test('rejects unauthorized and out-of-turn moves without mutation',()=>{
  const r=setup(),before=JSON.stringify(r);
  assert.throws(()=>command(r,'wrong','roll'));
  assert.throws(()=>command(r,r.players[1].id,'roll'));
  assert.equal(JSON.stringify(r),before);
});
test('buy transfers the correct price and ends a normal turn',()=>{
  const r=setup();roll(r,1,2);assert.equal(r.phase,'buy');
  command(r,r.players[0].id,'buy');assert.equal(r.owners[3],0);assert.equal(r.players[0].cash,1440);assert.equal(r.turn,1);
});
test('declining triggers auction including the player who declined',()=>{
  const r=setup();roll(r,1,2);command(r,r.players[0].id,'decline');
  command(r,r.players[0].id,'bid',10);assert.throws(()=>command(r,r.players[1].id,'bid',10));
  command(r,r.players[1].id,'bid',20);command(r,r.players[0].id,'pass');
  assert.equal(r.owners[3],1);assert.equal(r.players[1].cash,1480);assert.equal(r.turn,1);assert.equal(r.auction,null);
});
test('auction can end with no buyer',()=>{
  const r=setup();roll(r,1,2);command(r,r.players[0].id,'decline');
  command(r,r.players[0].id,'pass');command(r,r.players[1].id,'pass');assert.equal(r.owners[3],-1);assert.equal(r.phase,'roll');
});
test('passing GO pays salary and rent transfers between players',()=>{
  const r=setup();r.players[0].position=39;r.owners[3]=1;roll(r,1,3);
  assert.equal(r.players[0].position,3);assert.equal(r.players[0].cash,1696);assert.equal(r.players[1].cash,1504);
});
test('owning a color set doubles unimproved rent',()=>{
  const r=setup();r.owners[1]=1;r.owners[3]=1;roll(r,1,2);assert.equal(r.players[0].cash,1492);
});
test('station rent follows number of stations, utilities use dice',()=>{
  const r=setup();r.owners[5]=1;r.owners[15]=1;roll(r,2,3);assert.equal(r.players[0].cash,1450);
  const s=setup();s.owners[12]=1;s.owners[28]=1;roll(s,6,6);assert.equal(s.players[0].cash,1380);
});
test('three doubles send player to jail without passing GO',()=>{
  const r=setup();roll(r,1,1);roll(r,4,4);roll(r,6,6);
  assert.equal(r.players[0].position,10);assert.equal(r.players[0].jailed,true);assert.equal(r.turn,1);
});
test('leaving jail on doubles does not give an extra roll',()=>{
  const r=setup();r.players[0].position=10;r.players[0].jailed=true;roll(r,1,1);
  assert.equal(r.phase,'buy');command(r,r.players[0].id,'buy');assert.equal(r.turn,1);
});
test('insufficient cash ends this explicitly limited prototype',()=>{
  const r=setup();r.players[0].cash=1;r.owners[3]=1;roll(r,1,2);assert.equal(r.phase,'finished');assert.equal(r.winner,1);
});
