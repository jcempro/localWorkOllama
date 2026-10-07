// Inventário de evidências; não decide sucesso sem revisão humana/técnica.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const argsA7D = process.argv.slice(2);
const rootsA7D = argsA7D.filter(p => !p.startsWith('--output=')).map(p => path.resolve(p));
if (!rootsA7D.length) throw Error('Informe os diretórios jobs a examinar');
const outputA7D = path.resolve(argsA7D.find(p => p.startsWith('--output='))?.slice('--output='.length) || 'constructor/audit-private');
fs.mkdirSync(outputA7D, { recursive: true });
const recordsA7D = [], excludedA7D = [];
for (const root of rootsA7D) for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.isSymbolicLink() || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(entry.name)) continue;
  const dir = path.join(root, entry.name), artifacts = [], texts = {};
  const read = name => { try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch (e) { if(e.code==='ENOENT')return ''; throw e; } };
  let state;
  try { state = JSON.parse(read('state.json')); } catch (e) { recordsA7D.push({id:entry.name,root,invalid_state:String(e)}); continue; }
  if (state.status === 'CANCELLED') { excludedA7D.push({id:entry.name,root}); continue; }
  function walk(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder,item.name), relative=path.relative(dir,file).replaceAll('\\','/');
      if (item.isSymbolicLink()) {artifacts.push({path:relative,skipped:'link'});continue;}
      if(item.isDirectory()){walk(file);continue;}
      const body=fs.readFileSync(file);
      artifacts.push({path:relative,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')});
      if(/\.(json|log|txt|md|jsonl)$/.test(file))texts[relative]=body.toString('utf8');
    }
  }
  walk(dir);
  const parse = name => {try{return JSON.parse(texts[name]||'{}')}catch(e){return {parse_error:String(e)}}};
  const events=(texts['worker.log']||'').split('\n').flatMap((line,index)=>{
    if(!line.trim())return [];
    try{return [{line:index+1,...JSON.parse(line.slice(line.indexOf('{')))}]}catch{return [{line:index+1,parse_error:true}]}
  });
  const errors={};
  for(const event of events)if(event.outcome==='error'||event.outcome==='rejected'){
    const key=event.diagnostic||event.failure_class||'diagnóstico ausente'; errors[key]=(errors[key]||0)+1;
  }
  recordsA7D.push({id:entry.name,root,state,request:parse('request.json'),delivery:parse('delivery.json'),artifacts,events,errors,
    result:texts['result.md']||'',error:texts['error.txt']||'',stderr:texts['runner-stderr.log']||'',
    checkpoints:Object.keys(texts).filter(p=>p.startsWith('context/')).map(p=>({path:p,...parse(p)}))});
}
fs.writeFileSync(path.join(outputA7D,'inventory.json'),JSON.stringify({captured_at:new Date().toISOString(),roots:rootsA7D,excluded:excludedA7D,jobs:recordsA7D},null,2));
console.log(JSON.stringify({jobs:recordsA7D.length,excluded:excludedA7D.length,output:outputA7D,
  statuses:recordsA7D.reduce((a,j)=>(a[j.state?.status||'invalid']=(a[j.state?.status||'invalid']||0)+1,a),{})}));
