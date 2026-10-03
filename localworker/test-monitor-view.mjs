import assert from "node:assert/strict";
import vm from "node:vm";
import os from "node:os";
import { PAGE_M7Q } from "./monitor-page.mjs";
import { inventorySnapshot } from "./monitor.mjs";

// DOM mínimo: executa as funções reais de renderização sem depender de navegador remoto.
class Element {
  constructor(){this.children=[];this.dataset={};this.style={};this.attributes={};this.value="";this.textContent="";}
  append(...items){for(const item of items){item.parentElement=this;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  insertBefore(item,before){if(item.parentElement)item.parentElement.children=item.parentElement.children.filter(x=>x!==item);this.children.splice(this.children.indexOf(before),0,item);item.parentElement=this;}
  addEventListener(){}
  setAttribute(key,value){this.attributes[key]=value;}
  removeAttribute(key){delete this.attributes[key];}
  querySelector(){return this.note??=new Element();}
}
const scripts=PAGE_M7Q.split('<script>').slice(1).map(s=>s.split('</script>')[0]);
scripts.forEach(script=>new vm.Script(script));
const resource={cpu_percent:25,cpu_logical_processors:8,ram_total_bytes:16000,ram_available_bytes:4000,gpu_percent:35,gpu_used_mib:3000,gpu_total_mib:12000,gpu_free_total_mib:8800};
async function view(detail){
 const nodes=Object.fromEntries([...PAGE_M7Q.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 nodes.index.append(new Element(),new Element());const panel=new Element();panel.append(nodes.resourceGrid);nodes.detail.append(panel);
 let payload=detail?{state:{status:"RUNNING"},metrics:{generation_ms_observed:0},resource,progress:{},request:{},delivery:{},activity:{},events:[{at:"2026-01-01T01:00:00Z",phase:"old"},{at:"2026-01-01T02:00:00Z",phase:"new"}]}:{jobs:[],repositories:[],statuses:[],total:0,all_total:0,resource};
 const context=vm.createContext({URLSearchParams,location:{pathname:detail?'/job/00000000-0000-0000-0000-000000000001':'/',search:''},document:{getElementById:id=>nodes[id],createElement:()=>new Element(),addEventListener(){},hidden:false},fetch:async()=>({ok:true,json:async()=>payload}),setInterval(){}});
 vm.runInContext(scripts[0],context);await new Promise(resolve=>setImmediate(resolve));
 if(detail){
   assert.equal(nodes.events.children[0].children[1].textContent,"new ");
   payload.events.push({at:"2026-01-01T03:00:00Z",phase:"latest"});payload.state.status="FAILED";
   await vm.runInContext('update()',context);
   assert.equal(nodes.events.children[0].children[1].textContent,"latest ");
   assert.deepEqual(payload.events.map(e=>e.phase),["old","new","latest"]);
 }else{
   assert.equal(nodes.index.children[1],panel);
   assert.equal(nodes.resourceGrid.children.length,4);
   const widths=nodes.resourceGrid.children.map(c=>c.children[1].children[0].style.width);
   assert.deepEqual(widths,["25%","75%","35%","25%"]);
   payload.jobs=[1,2].map(n=>({job_id:String(n),status:"RUNNING",task:"teste",repo:"alvo"}));payload.total=payload.all_total=2;
   await vm.runInContext('update()',context);
   assert.equal(nodes.resourceGrid.children.length,4);
   assert.deepEqual(nodes.resourceGrid.children.map(c=>c.children[1].children[0].style.width),widths);
   payload.resource={};await vm.runInContext('update()',context);
   assert.ok(nodes.resourceGrid.children.every(c=>c.dataset.unavailable==="true"));
 }
}
await view(false);await view(true);
const [a,b]=await Promise.all([inventorySnapshot(),inventorySnapshot({status:"RUNNING"})]);
assert.equal(a.resource.scope,"machine");
assert.deepEqual(a.resource,b.resource);
assert.equal(a.resource.ram_total_bytes,os.totalmem());
assert.ok(a.resource.ram_available_bytes>=0&&a.resource.ram_available_bytes<=a.resource.ram_total_bytes);
console.log(JSON.stringify({timeline:"descending/live/terminal",global_resources:"single machine sample; unchanged by job count",ram_total:a.resource.ram_total_bytes}));
