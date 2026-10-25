// Instrumento factual próprio; não executa fonte/argv histórico nem o helper completo.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [packetPathN5P,packetHashN5P]=process.argv.slice(2);
const bytesN5P=fs.readFileSync(packetPathN5P);
const hashN5P=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
assert.equal(hashN5P(bytesN5P),packetHashN5P);
const packetN5P=JSON.parse(bytesN5P.toString('utf8'));
const originalN5P=packetN5P.proposal_source,appliedN5P=packetN5P.applied_source;
assert.equal(hashN5P(originalN5P),packetN5P.origin.proposal_source_sha256);
assert.equal(hashN5P(appliedN5P),packetN5P.origin.applied_source_sha256);
const recognizeN5P=(source:string,expressions:string[])=>{
 for(const text of expressions){const start=source.indexOf(text);assert(start>=0&&source.indexOf(text,start+1)<0,'N5P_UNKNOWN_OR_NONUNIQUE_EXPRESSION');}
};
recognizeN5P(originalN5P,["if (next.type !== 'table') continue;","if (para.type !== 'paragraph') continue;",
 'const blockEnd = next.position.end.offset;','const ialStart = para.position.start.offset;','const ialEnd = para.position.end.offset;',
 'if (!Number.isInteger(blockEnd) || !Number.isInteger(ialStart) || !Number.isInteger(ialEnd)) continue;']);
recognizeN5P(appliedN5P,["if (next?.type !== 'table' && next?.type !== 'heading') continue;","if (para?.type !== 'paragraph') continue;",
 'const blockEnd = next.position?.end?.offset;','const ialStart = para.position?.start?.offset;','const ialEnd = para.position?.end?.offset;',
 'if (para.position?.start?.column !== 1 || !Number.isInteger(para.position.start.line) || para.position.start.line !== para.position.end?.line) continue;',
 'if (!Number.isInteger(blockEnd) || !Number.isInteger(ialStart) || !Number.isInteger(ialEnd)) continue;']);
// Extrai somente o bloco de proposta; não confunde menções no requisito com código.
assert(!originalN5P.includes('.column')&&!originalN5P.includes('.line'),'N5P_ORIGINAL_POSITION_GUARD_CHANGED');
const positionsN5P={start:{offset:2,column:1,line:2},end:{offset:8,line:2}};
const paraN5P=()=>({type:'paragraph',position:structuredClone(positionsN5P)});
const accessN5P=(name:string,old:()=>unknown,now:()=>unknown)=>{
 const run=(f:()=>unknown)=>{try {const value=f();return {outcome:'VALUE',integer:Number.isInteger(value)};}catch(e:any){return {outcome:e.name};}};
 return {name,original:run(old),applied:run(now)};
};
const blockMissingN5P:any={type:'table'},paraMissingN5P:any={type:'paragraph'};
const blockEndMissingN5P:any={type:'table',position:{}},paraEndMissingN5P:any={type:'paragraph',position:{start:positionsN5P.start}};
const nullNodeN5P:any=null,nullParaN5P:any=null;
const accessesN5P=[
 accessN5P('null_node',()=>nullNodeN5P.type,()=>nullNodeN5P?.type),
 accessN5P('null_paragraph',()=>nullParaN5P.type,()=>nullParaN5P?.type),
 accessN5P('missing_block_position',()=>blockMissingN5P.position.end.offset,()=>blockMissingN5P.position?.end?.offset),
 accessN5P('missing_paragraph_position',()=>paraMissingN5P.position.start.offset,()=>paraMissingN5P.position?.start?.offset),
 accessN5P('missing_block_end',()=>blockEndMissingN5P.position.end.offset,()=>blockEndMissingN5P.position?.end?.offset),
 accessN5P('missing_paragraph_end',()=>paraEndMissingN5P.position.end.offset,()=>paraEndMissingN5P.position?.end?.offset)
];
for(const row of accessesN5P){assert.equal(row.original.outcome,'TypeError');assert.deepEqual(row.applied,{outcome:'VALUE',integer:false});}
// Guardas fixas próprias. Tipos/índices/gap/ALD já examinados em C2B não são recalculados.
const guardN5P=(para:any)=>!(para.position?.start?.column!==1 || !Number.isInteger(para.position.start.line) || para.position.start.line!==para.position.end?.line);
const variantsN5P=[{name:'column_one_same_line',column:1,endLine:2,expected:true},
 {name:'indented',column:2,endLine:2,expected:false},{name:'multiline',column:1,endLine:3,expected:false}];
const guardsN5P=variantsN5P.map(row=>{const para=paraN5P();para.position.start.column=row.column;para.position.end.line=row.endLine;
 const original=true,applied=guardN5P(para);assert.equal(applied,row.expected);return {name:row.name,expected:row.expected,original,applied};});
console.log('N5P_POSITION_TRACE '+JSON.stringify({packet_sha256:packetHashN5P,accesses:accessesN5P,position_guards:guardsN5P,
 scope:'recognized_access_and_column_line_guards_only',invalid_shape_is_not_proven_real_AST:true,
 historical_code_executed:false,historical_tests_repeated:false,full_helper_validated:false}));
