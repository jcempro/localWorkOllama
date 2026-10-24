// Instrumento factual interno. Nunca importa/executa fonte, argv ou testes históricos.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [packetPathC2B,packetHashC2B]=process.argv.slice(2);
const bytesC2B=fs.readFileSync(packetPathC2B);
const hashC2B=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
assert.equal(hashC2B(bytesC2B),packetHashC2B);
const packetC2B=JSON.parse(bytesC2B.toString('utf8'));
const originalC2B=packetC2B.proposal_source,appliedC2B=packetC2B.applied_source;
assert.equal(hashC2B(originalC2B),packetC2B.origin.proposal_source_sha256);
assert.equal(hashC2B(appliedC2B),packetC2B.origin.applied_source_sha256);
const recognizeC2B=(source:string,expressions:string[])=>{
  for(const text of expressions){const start=source.indexOf(text);assert(start>=0&&source.indexOf(text,start+1)<0,'C2B_UNKNOWN_OR_NONUNIQUE_EXPRESSION');}
};
recognizeC2B(originalC2B,["if (next.type !== 'table') continue;",'let blockIndex = 0;',
 'result.push({ blockIndex, ialIndex: 0, raw });','blockIndex++;',
 "if (!/^(?:\\r?\\n)?$/.test(gap)) continue;","if (/^\\{: *\\w/.test(raw)) continue;"]);
recognizeC2B(appliedC2B,["if (next?.type !== 'table' && next?.type !== 'heading') continue;",
 'result.push({ blockIndex: i, ialIndex: i + 1, raw });',
 "if (gap !== '\\n' && gap !== '\\r\\n') continue;","if (/^\\{:\\s*[\\w-]+:/.test(raw)) continue;"]);
// Regras próprias fixas equivalentes somente às expressões reconhecidas acima.
const typesC2B=['table','heading','paragraph'].map(type=>({type,expected:type==='table'||type==='heading',
 original:type==='table',applied:type==='table'||type==='heading'}));
const indexesC2B=[{i:0,priorAccepted:0},{i:4,priorAccepted:1}].map(({i,priorAccepted})=>({i,priorAccepted,
 expected:{blockIndex:i,ialIndex:i+1},original:{blockIndex:priorAccepted,ialIndex:0},applied:{blockIndex:i,ialIndex:i+1}}));
const gapsC2B=[['empty',''],['LF','\n'],['CRLF','\r\n'],['double_LF','\n\n'],['space',' ']].map(([name,gap])=>({name,
 expected:gap==='\n'||gap==='\r\n',original:/^(?:\r?\n)?$/.test(gap),applied:gap==='\n'||gap==='\r\n'}));
const aldInputsC2B=[{name:'class',raw:'{: .x}',expected:true},{name:'attribute',raw:'{: title="x"}',expected:true},
 {name:'ALD',raw:'{:name:x}',expected:false},{name:'spaced_ALD',raw:'{: name:x}',expected:false}];
const aldC2B=aldInputsC2B.map(({name,raw,expected})=>({name,expected,original:!/^\{: *\w/.test(raw),applied:!/^\{:\s*[\w-]+:/.test(raw)}));
const comparableC2B=[...typesC2B,...gapsC2B,...aldC2B];
const mismatchC2B=(key:string)=>comparableC2B.filter(c=>c[key]!==c.expected).map(c=>c.name??c.type);
assert.deepEqual(mismatchC2B('applied'),[]);
assert.deepEqual(mismatchC2B('original'),['heading','empty','attribute']);
for(const c of indexesC2B){assert.deepEqual(c.applied,c.expected);assert.notDeepEqual(c.original,c.expected);}
console.log('C2B_COLLECTOR_TRACE '+JSON.stringify({packet_sha256:packetHashC2B,types:typesC2B,indexes:indexesC2B,gaps:gapsC2B,ald:aldC2B,
 original_mismatches:mismatchC2B('original'),index_mismatches:indexesC2B.length,applied_mismatches:[],
 scope:'four_recognized_predicates_only',historical_code_executed:false,historical_tests_repeated:false,full_helper_validated:false}));
