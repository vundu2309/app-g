import { randomInt, randomUUID } from 'node:crypto';

// Values follow the US classic board. Names are original prototype labels.
const names = ['Xuat phat','Pho Vuon','Cong dong','Pho Ho','Thue thu nhap','Ga Nam','Pho May','Co hoi','Pho Song','Pho Gio','Tham tu','Dai lo Hoa','Dien luc','Dai lo Nang','Dai lo Sao','Ga Tay','Khu Sang Tao','Cong dong','Khu Trien Lam','Khu Thiet Ke','Bai do xe','Khu Thuong Mai','Co hoi','Khu Tai Chinh','Khu Ngan Hang','Ga Bac','Khu Cong Nghe','Khu Du Lieu','Cap nuoc','Khu Nghien Cuu','Vao tu','Ben Cang','Ben Du Thuyen','Cong dong','Ben Hai Dang','Ga Dong','Co hoi','Quang Truong','Thue xa xi','Thap Trung Tam'];
const prices = {1:60,3:60,5:200,6:100,8:100,9:120,11:140,12:150,13:140,14:160,15:200,16:180,18:180,19:200,21:220,23:220,24:240,25:200,26:260,27:260,28:150,29:280,31:300,32:300,34:320,35:200,37:350,39:400};
const rents = {1:2,3:4,6:6,8:6,9:8,11:10,13:10,14:12,16:14,18:14,19:16,21:18,23:18,24:20,26:22,27:22,29:24,31:26,32:26,34:28,37:35,39:50};
const groups = [[1,3],[6,8,9],[11,13,14],[16,18,19],[21,23,24],[26,27,29],[31,32,34],[37,39]];
export const board = names.map((name,index) => ({index,name,price:prices[index] || 0,rent:rents[index] || 0,group:groups.findIndex(g=>g.includes(index)),type:[5,15,25,35].includes(index)?'station':[12,28].includes(index)?'utility':prices[index]?'street':'special'}));

export class GameError extends Error {}
function check(condition,message) { if (!condition) throw new GameError(message); }
export function createRoom(name='Nguoi choi 1') {
  return {id:randomUUID().slice(0,6).toUpperCase(),players:[player(name)],turn:0,phase:'waiting',owners:Array(40).fill(-1),dice:[0,0],doubles:0,auction:null,winner:-1,log:['Ban thu LAN: chua co the su kien, xay nha, giao dich va the chap.'],revision:0};
}
function player(name) { return {id:randomUUID(),name:String(name).trim().slice(0,24)||'Nguoi choi',cash:1500,position:0,jailed:false,jailTurns:0,bankrupt:false}; }
export function join(room,name) {
  check(room.phase==='waiting' && room.players.length<2,'Phong da du 2 nguoi.');
  const p=player(name);room.players.push(p);room.phase='roll';room.log.push('Du 2 nguoi. Bat dau van!');room.revision++;return p;
}
export function view(room) { return {...room,players:room.players.map(({id,...p})=>p),board}; }
function note(r,s) { r.log.push(s);r.log=r.log.slice(-16); }
function finishTurn(r) {
  if(r.phase==='finished')return;
  if(r.doubles>0 && !r.players[r.turn].jailed) {r.phase='roll';return;}
  r.turn=(r.turn+1)%r.players.length;r.doubles=0;r.phase='roll';
}
function jail(r,p) {p.position=10;p.jailed=true;p.jailTurns=0;r.doubles=0;note(r,`${p.name} vao tu.`);finishTurn(r);}
function pay(r,p,amount,to=-1) {
  if(p.cash<amount) {
    const cash=p.cash;p.cash=0;p.bankrupt=true;
    if(to>=0)r.players[to].cash+=cash;
    r.owners=r.owners.map(owner=>owner===r.turn?to:owner);
    r.phase='finished';r.winner=to>=0?to:(r.turn+1)%r.players.length;
    note(r,`${p.name} het tien. Ban thu ket thuc (chua ho tro thanh ly tai san).`);return;
  }
  p.cash-=amount;if(to>=0)r.players[to].cash+=amount;
}
function land(r,p,total) {
  const tile=board[p.position], owner=r.owners[p.position];
  if(tile.price && owner<0) {r.phase='buy';return;}
  if(tile.price && owner!==r.turn) {
    let rent=tile.rent;
    if(tile.type==='station')rent=25*2**(board.filter(t=>t.type==='station'&&r.owners[t.index]===owner).length-1);
    else if(tile.type==='utility')rent=total*(r.owners[12]===owner&&r.owners[28]===owner?10:4);
    else if(groups[tile.group].every(i=>r.owners[i]===owner))rent*=2;
    pay(r,p,rent,owner);note(r,`${p.name} tra tien thue ${rent}.`);
  } else if(p.position===4 || p.position===38) {const tax=p.position===4?200:100;pay(r,p,tax);note(r,`${p.name} nop thue ${tax}.`);}
  else if(p.position===30) {jail(r,p);return;}
  else if([2,7,17,22,33,36].includes(p.position))note(r,'O su kien: tam bo qua trong ban thu ket noi.');
  finishTurn(r);
}
export function command(r,token,action,value,roll=()=>randomInt(1,7)) {
  const who=r.players.findIndex(p=>p.id===token);check(who>=0,'Ma nguoi choi khong hop le.');
  check(r.phase!=='waiting' && r.phase!=='finished','Van chua bat dau hoac da ket thuc.');
  const p=r.players[who];
  if(action==='bid' || action==='pass') {
    check(r.phase==='auction','Khong co dau gia.');
    const a=r.auction;check(!a.passed.includes(who),'Ban da bo dau gia.');
    if(action==='bid') {
      check(who!==a.leader,'Ban dang dan dau.');
      check(Number.isInteger(value)&&value>a.bid&&value<=p.cash,'Gia phai cao hon muc hien tai va khong vuot so du.');
      a.bid=value;a.leader=who;note(r,`${p.name} tra gia ${value}.`);
    } else {check(who!==a.leader,'Nguoi dan dau khong the bo gia.');a.passed.push(who);}
    const active=r.players.map((_,i)=>i).filter(i=>!a.passed.includes(i));
    if(a.leader>=0 && active.length===1) {
      r.players[a.leader].cash-=a.bid;r.owners[a.tile]=a.leader;note(r,`${r.players[a.leader].name} thang dau gia ${a.bid}.`);r.auction=null;finishTurn(r);
    } else if(!active.length) {r.auction=null;finishTurn(r);}
    r.revision++;return;
  }
  check(who===r.turn,'Chua den luot cua ban.');
  if(action==='roll') {
    check(r.phase==='roll','Chua the do xuc xac.');
    const d=[roll(),roll()];check(d.every(x=>Number.isInteger(x)&&x>=1&&x<=6),'Xuc xac khong hop le.');r.dice=d;
    const pair=d[0]===d[1], total=d[0]+d[1];note(r,`${p.name} do ${d[0]} + ${d[1]}.`);
    if(p.jailed) {
      p.jailTurns++;
      if(pair) {p.jailed=false;p.jailTurns=0;r.doubles=0;}
      else if(p.jailTurns>=3) {pay(r,p,50);if(r.phase==='finished'){r.revision++;return;}p.jailed=false;p.jailTurns=0;}
      else {r.doubles=0;finishTurn(r);r.revision++;return;}
    } else {r.doubles=pair?r.doubles+1:0;if(r.doubles===3){jail(r,p);r.revision++;return;}}
    if(p.position+total>=40){p.cash+=200;note(r,`${p.name} qua Xuat phat, nhan 200.`);}
    p.position=(p.position+total)%40;land(r,p,total);
  } else if(action==='buy') {
    check(r.phase==='buy','Khong co dat de mua.');const tile=board[p.position];check(p.cash>=tile.price,'Khong du tien.');p.cash-=tile.price;r.owners[p.position]=who;note(r,`${p.name} mua ${tile.name}.`);finishTurn(r);
  } else if(action==='decline') {
    check(r.phase==='buy','Khong co dat de dau gia.');r.phase='auction';r.auction={tile:p.position,bid:0,leader:-1,passed:[]};note(r,`Dau gia ${board[p.position].name}. Ca hai nguoi duoc tham gia.`);
  } else throw new GameError('Hanh dong khong hop le.');
  r.revision++;
}
