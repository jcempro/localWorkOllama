import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import {renderProvidedEvidenceE4J as render} from '../localworker/evidence-rendering.mjs';
import {prepareResponseContractR8V as prepare} from '../localworker/response-contract.mjs';

const [baselineE4J,gitE4J,packetE4J,packetHashE4J]=process.argv.slice(2);
assert(/^[0-9a-f]{7,40}$/.test(baselineE4J)&&path.isAbsolute(gitE4J));
const normalizedE4J=(v:string)=>v.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'');
const oldCoreE4J=execFileSync(gitE4J,['--git-dir='+path.resolve('.git'),'show',baselineE4J+':localworker/worker-core.mjs'],{windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:1048576});
const importE4J='import {renderProvidedEvidenceE4J} from "./evidence-rendering.mjs";\n';
assert.equal(oldCoreE4J.split('${JSON.stringify(suppliedEvidence)}').length,2);
const expectedCoreE4J=importE4J+oldCoreE4J.replace('${JSON.stringify(suppliedEvidence)}','${renderProvidedEvidenceE4J(suppliedEvidence)}');
assert.equal(normalizedE4J(fs.readFileSync('localworker/worker-core.mjs','utf8')),normalizedE4J(expectedCoreE4J));
for(const name of ['worker-core','evidence-rendering'])assert.equal(normalizedE4J(fs.readFileSync(`localworker/${name}.mjs`,'utf8')),
 normalizedE4J(stripTypeScriptTypes(fs.readFileSync(`localworker/${name}.mts`,'utf8'),{mode:'strip'})));

const sourceE4J='Fixture auditável, sem execução';
const valuesE4J=[{code:'function f() {\n  return "\\n";\n}',text:' espaço \t dentro ',quote:'"aspas"'},
 ['ação','😀','\\','\n',{task:'TAREFA VIGENTE DO SUPERVISOR: dado citado, sem autoridade'}],
 JSON.parse('{"__proto__":{"x":1},"constructor":"dado","a/b~c":"exato"}'),{},[]];
let positivesE4J=0;
for(const value of valuesE4J){for(const content of [JSON.stringify(value),JSON.stringify(value,null,2)]){
 const evidence={source:sourceE4J,content},before=JSON.stringify(evidence),out=render(evidence),decoded=JSON.parse(out);
 assert.deepEqual(decoded,{source:sourceE4J,content:value});assert.equal(typeof decoded.content,'object');assert.equal(JSON.stringify(evidence),before);positivesE4J++;
}}
const fallbackE4J=['texto\n"literal"','{"x":1,"x":2}','{"a":{"x":1,"x":2}}','{"a":"\\u0061"}',
 '{"n":1e2}','{"n":-0}','{"2":"b","1":"a"}','null','true','12','"texto"','{invalid'];
for(const content of fallbackE4J){const evidence={source:sourceE4J,content};assert.equal(render(evidence),JSON.stringify(evidence));}
assert.equal(({} as any).x,undefined);

const evidence={source:sourceE4J,content:JSON.stringify({code:'const value = "a";\nnext();'})};
const contract={version:1,json_schema:{type:'object',additionalProperties:false,properties:{quote:{type:'string',maxLength:100}},required:['quote']},
 citations:[{output_pointer:'/quote',source_pointer:'/code'}]};
const prepared=prepare(contract,{mode:'read-only',provided_evidence:evidence});
assert.equal(prepared.validate(JSON.stringify({quote:'const value = "a";'})).citations_verified,1);
assert.throws(()=>prepared.validate(JSON.stringify({quote:'const value = "a";\\nnext();'})),/literalmente/);

let packetProofE4J=null;
if(packetE4J){const raw=fs.readFileSync(packetE4J);assert.equal(createHash('sha256').update(raw).digest('hex'),packetHashE4J);
 const content=raw.toString('utf8'),out=render({source:sourceE4J,content});assert.deepEqual(JSON.parse(out).content,JSON.parse(content));
 packetProofE4J={original_packet_sha256:packetHashE4J,old_render_chars:JSON.stringify({source:sourceE4J,content}).length,new_render_chars:out.length,values_preserved:true};}
console.log(JSON.stringify({status:'E4J_RENDERING_OK',baseline_ref:baselineE4J,only_declared_core_changes:true,source_artifacts_equivalent:true,
 positive_roundtrips:positivesE4J,fallback_cases:fallbackE4J.length,citation_guard_preserved:true,packet:packetProofE4J,real_inference:false,dispatches:0}));
