import assert from 'node:assert/strict';
import {prepareResponseContractR8V as prepare,ResponseContractErrorR8V} from './response-contract.mjs';
import {scopeHashS4W} from './delegation-policy.mjs';
const evidence={cases:[{id:'a',text:'Requisito original A. Não declarar aprovação.'},{id:'b',text:'diff_check; exit_code=0'}],escaped:{'a/b~c':'Aspas "literais" e ação.'}};
const request={mode:'read-only',provided_evidence:{source:'fixture explícita',content:JSON.stringify(evidence)}};
const schema={type:'object',properties:{quote:{type:'string',maxLength:180},conclusion:{type:'string',enum:['LIMITED','REVIEW_REQUIRED'],maxLength:40}},required:['quote','conclusion'],additionalProperties:false};
const contract={version:1,json_schema:schema,max_words:30,citations:[{output_pointer:'/quote',source_pointer:'/cases/1/text'}]};
const p=prepare(contract,request);
assert.equal(prepare(undefined,request),null);
const base={repoPath:process.cwd(),task:'Fixture de hash',thread_id:'00000000-0000-4000-8000-000000000000'};
assert.equal(scopeHashS4W(base),scopeHashS4W({...base,response_contract:undefined}));
assert.notEqual(scopeHashS4W(base),scopeHashS4W({...base,response_contract:contract}));
assert.notEqual(scopeHashS4W({...base,response_contract:contract}),scopeHashS4W({...base,response_contract:{...contract,max_words:31}}));
assert.deepEqual(p.format,schema);
assert.match(p.prompt,/sem cercas Markdown/);
assert.deepEqual(p.validate('{"quote":"diff_check; exit_code=0","conclusion":"LIMITED"}'),{words:2,json_schema_verified:true,citations_verified:1,semantic_acceptance:'NOT_ASSESSED'});
for(const text of ['```json\n{"quote":"diff_check","conclusion":"LIMITED"}\n```','{"quote":"diff_check","conclusion":"INVENTED"}',
  '{"quote":"diff_check","conclusion":"LIMITED","extra":true}','{"quote":"Requisito original A.","conclusion":"LIMITED"}',
  '{"quote":"diff check","conclusion":"LIMITED"}','{"quote":"","conclusion":"LIMITED"}','{"conclusion":"LIMITED"}'])
  assert.throws(()=>p.validate(text),ResponseContractErrorR8V);
assert.throws(()=>prepare({...contract,max_words:1},request).validate('{"quote":"diff_check; exit_code=0","conclusion":"LIMITED"}'),/palavras/);
assert.equal(prepare({version:1,max_words:2},{mode:'write'}).validate('uma palavra').words,2);
assert.throws(()=>prepare({version:1,max_words:2},{mode:'write'}).validate('três palavras aqui'),/palavras/);
for(const patch of [{version:2},{max_words:0},{max_words:2001},{max_words:2.5},{extra:true},
  {citations:[{output_pointer:'/quote',source_pointer:'/cases/0/id/nope'}]},
  {citations:[{output_pointer:'/quote',source_pointer:'/cases/9/text'}]},
  {citations:[{output_pointer:'/quote',source_pointer:'/cases/01/text'}]},
  {citations:[{output_pointer:'/quote',source_pointer:'/cases/1'}]},
  {citations:[{output_pointer:'/quote',source_pointer:'/cases/1/text~x'}]},
  {citations:[...contract.citations,...contract.citations]}])assert.throws(()=>prepare({...contract,...patch},request),ResponseContractErrorR8V);
for(const patch of [{mode:'write'},{provided_evidence:undefined},{required_read_paths:['a']},{required_command_ids:['test']},{command_sequence:['test']},{authorized_commands:[{id:'test'}]}])
  assert.throws(()=>prepare(contract,{...request,...patch}),/read-only/);
for(const invalid of [null,{}, {version:1},{version:1,max_words:3,citations:contract.citations},
  {...contract,json_schema:{$ref:'https://invalid.example/schema'}},
  {...contract,json_schema:{...schema,pattern:'.*'}},
  {...contract,json_schema:{...schema,additionalProperties:true}},
  {...contract,json_schema:{...schema,required:['quote','quote']}},
  {...contract,json_schema:{...schema,properties:{...schema.properties,bad:{type:'array',items:{type:'boolean'}}}}},
  {...contract,json_schema:{...schema,properties:{bad:{type:'string',maxLength:4001}}}},
  {...contract,json_schema:{...schema,properties:{bad:{type:'string',maxLength:10,pattern:'(a+)+$'}}}},
  {...contract,json_schema:JSON.parse('{"type":"object","properties":{"__proto__":{"type":"boolean"}},"required":[],"additionalProperties":false}')}])
  assert.throws(()=>prepare(invalid,request),ResponseContractErrorR8V);
const escaped=prepare({...contract,citations:[{output_pointer:'/quote',source_pointer:'/escaped/a~1b~0c'}]},request);
escaped.validate(JSON.stringify({quote:'Aspas "literais"',conclusion:'REVIEW_REQUIRED'}));
const inherited=prepare({...contract,citations:[{output_pointer:'/toString',source_pointer:'/cases/1/text'}]},request);
assert.throws(()=>inherited.validate('{"quote":"diff_check","conclusion":"LIMITED"}'),/Pointer/);
const wide={type:'object',properties:Object.fromEntries(Array.from({length:33},(_,i)=>['k'+i,{type:'boolean'}])),required:[],additionalProperties:false};
assert.throws(()=>prepare({...contract,json_schema:wide},request),/objeto/);
let deep={type:'string',maxLength:10};for(let i=0;i<10;i++)deep={type:'object',properties:{nested:deep},required:[],additionalProperties:false};
assert.throws(()=>prepare({...contract,json_schema:deep},request),/complexidade/);
console.log('R8V_PURE_OK: schema/Zod, JSON, word bound, exact provenance, escaped pointers, limits, no prototype lookup, legacy unchanged');
