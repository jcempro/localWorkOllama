// A8P: provas próprias dos predicados aplicados; não executar código/argv histórico.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [packetPathA8P,packetHashA8P]=process.argv.slice(2);
const rawA8P=fs.readFileSync(packetPathA8P),hashA8P=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
assert.equal(hashA8P(rawA8P),packetHashA8P);
const p=JSON.parse(rawA8P.toString('utf8'));
for(const s of [p.applied_factory,p.applied_wrapper])assert.equal(hashA8P(s.source),s.source_sha256);
assert.equal(hashA8P('G6B_WRAPPER_TRACE '+JSON.stringify(p.previous_wrapper_trace)),p.origin.old_trace_sha256);
assert.equal(hashA8P(JSON.stringify(p.previous_spread_proof,null,2)),p.origin.old_spread_proof_sha256);
const recognizeA8P=(source:string,texts:string[])=>{for(const text of texts){const start=source.indexOf(text);assert(start>=0&&source.indexOf(text,start+1)<0,'A8P_UNKNOWN_OR_NONUNIQUE_EXPRESSION');}};
recognizeA8P(p.applied_factory.source,["mdast: {\n        ...basePrinter,\n        preprocess,\n        print,\n        getVisitorKeys\n      }"]);
recognizeA8P(p.applied_wrapper.source,['if (pairs.length === 0) return ast;','ialIndexSetByBlock.set(pair.blockIndex, set);',
 'set.add(pair.ialIndex);','const blockIndex = i;','const set = ialIndexSetByBlock.get(blockIndex);',
 'if (pairs.some(pair => pair.ialIndex === i)) {\n      // omitir nós cujo índice esteja em ialIndex\n      continue;\n    }',
 'if (set) {','const blockChild = child;','const pair = pairs.find(p => p.blockIndex === blockIndex);','newChildren.push({']);
const names=['preprocess','print','getVisitorKeys'];
const base=Object.fromEntries([...names.map(k=>[k,'base-'+k]),['embed','base-embed']]);
const custom=Object.fromEntries(names.map(k=>[k,'custom-'+k]));
const composed={...base,...custom};
for(const key of names)assert.equal(composed[key],custom[key]);assert.equal(composed.embed,base.embed);
const hooks={collisions_select_custom:names,base_only_embed_preserved:true,old_bindings_reused:p.previous_spread_proof.colliding_properties};
assert.equal(p.previous_wrapper_trace.results.length,4);
const rows=p.previous_wrapper_trace.results.map((old:any)=>{
 // Reutiliza o trace recebido; IAL omitido recebe label sintético sem inferir seu conteúdo real.
 let cursor=0;
 const children=old.adjacent_pairs.length?old.actions.map((a:any,i:number)=>{assert.equal(a.i,i);assert(['push','omit'].includes(a.action));return a.action==='push'?old.actual[cursor++]:`OMITTED_IAL_${i}`;}):[...old.actual];
 if(old.adjacent_pairs.length)assert.equal(cursor,old.actual.length);
 const pairs=old.adjacent_pairs.map(([blockIndex,ialIndex]:number[])=>{assert.equal(ialIndex,blockIndex+1);assert(ialIndex<children.length);return {blockIndex,ialIndex};});
 const map=new Map<number,Set<number>>();for(const pair of pairs){const set=map.get(pair.blockIndex)??new Set<number>();set.add(pair.ialIndex);map.set(pair.blockIndex,set);}
 const actual:string[]=[];
 if(!pairs.length)actual.push(...children);
 else for(let i=0;i<children.length;i++){
  if(pairs.some((pair:any)=>pair.ialIndex===i))continue;
  if(map.get(i)){const pair=pairs.find((pair:any)=>pair.blockIndex===i);assert(pair&&children[i]);actual.push('WRAP_'+children[i]);}
  else actual.push(children[i]);
 }
 assert.deepEqual(actual,old.expected);
 return {name:old.name,original_trace_actual:old.actual,applied_actual:actual,expected:old.expected,matches:true};
});
console.log('A8P_APPLIED_TRACE '+JSON.stringify({packet_sha256:packetHashA8P,hooks,grouping:rows,
 previous_algorithms_reexecuted:false,historical_source_executed:false,historical_tests_repeated:false,
 scope:'two_recognized_corrections_only',full_plugin_validated:false}));
