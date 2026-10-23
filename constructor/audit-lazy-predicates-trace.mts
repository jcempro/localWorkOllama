// P4K: comparação factual interna; não executa fonte, patches ou comandos históricos.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_PACKET_BYTES_P4K=16384;
const MAX_FRAGMENT_CHARS_P4K=4096;
const ORIGINAL_FILTER_P4K=[
  String.raw`const ialMatch = /^\{:([^}]*)\}$/.exec(lineText.trimEnd());`,
  'if (ialMatch) {',
];
const APPLIED_FILTER_P4K=[
  String.raw`const ialMatch = /^\{:(?!:)[^\r\n]*\}$/.exec(lineText.trimEnd());`,
  String.raw`if (ialMatch && !/^\{:\s*[\w-]+:/.test(lineText)) {`,
];
const APPLIED_PREVIOUS_P4K=[
  'let prevLineStart = 0;',
  String.raw`const prevNewline = source.lastIndexOf('\n', lineStart - 2);`,
  'prevLineStart = prevNewline === -1 ? 0 : prevNewline + 1;',
  'const prevLineText = source.slice(prevLineStart, lineStart);',
  "if (prevLineText.trim() !== '') {",
];
const FILTER_CASES_P4K=[
  {id:'ordinary',line:'{: .a}',expected:true},
  {id:'double_colon',line:'{::foo}',expected:false},
  {id:'named_ald',line:'{:nome:x}',expected:false},
  {id:'spaced_ald',line:'{: nome:x}',expected:false},
  {id:'indented',line:' {: .a}',expected:false},
  {id:'quoted',line:'>{: .a}',expected:false},
  {id:'trailing_ws',line:'{: .a} \t',expected:true},
  {id:'attribute_colon',line:'{: data-x="a:b"}',expected:true},
  {id:'id',line:'{: #a}',expected:true},
];
const PREVIOUS_CASES_P4K=[
  {id:'LF_final',older:'',previous:'x',eol:'\n',trailing:false},
  {id:'LF_nonfinal',older:'old\n',previous:'x',eol:'\n',trailing:true},
  {id:'CRLF_final',older:'',previous:'x',eol:'\r\n',trailing:false},
  {id:'UTF16_CRLF',older:'old\r\n',previous:'😀x',eol:'\r\n',trailing:true},
  {id:'blank_control',older:'',previous:' ',eol:'\n',trailing:false},
];

const [input,expectedHash,...extra]=process.argv.slice(2);
if(!input||!/^[a-f0-9]{64}$/.test(expectedHash??'')||extra.length)throw Error('P4K_ARGS: <packet> <sha256>');
const root=await fs.realpath(process.cwd()),file=await fs.realpath(input),stat=await fs.lstat(input);
if(!file.toLowerCase().startsWith((root+path.sep).toLowerCase())||!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_PACKET_BYTES_P4K)throw Error('P4K_PACKET_BOUNDARY');
const bytes=await fs.readFile(file);
if(createHash('sha256').update(bytes).digest('hex')!==expectedHash)throw Error('P4K_PACKET_HASH');
const packet=JSON.parse(bytes.toString('utf8'));
if(packet.schema!=='audit-lazy-predicates/v1'||packet.prior_l1_trace?.trace?.source_field!=='proposal_previous_line')throw Error('P4K_SCHEMA');
function requireLines(fragment,expressions){
  if(typeof fragment!=='string'||fragment.length>MAX_FRAGMENT_CHARS_P4K)throw Error('P4K_FRAGMENT');
  const lines=fragment.split('\n').map(line=>line.trim());
  for(const expression of expressions)if(lines.filter(line=>line===expression).length!==1)throw Error('P4K_EXPRESSION_NOT_RECOGNIZED');
}
requireLines(packet.original_ial_filter,ORIGINAL_FILTER_P4K);
requireLines(packet.applied_ial_filter,APPLIED_FILTER_P4K);
requireLines(packet.applied_previous_line,APPLIED_PREVIOUS_P4K);

// Predicados próprios fixos correspondentes às expressões reconhecidas, nunca regex/código arbitrário do pacote.
const filterCases=FILTER_CASES_P4K.map(c=>({id:c.id,line:c.line,expected:c.expected,
  original:/^\{:([^}]*)\}$/.test(c.line.trimEnd()),
  applied:/^\{:(?!:)[^\r\n]*\}$/.test(c.line.trimEnd())&&!/^\{:\s*[\w-]+:/.test(c.line)}));
const previousCases=PREVIOUS_CASES_P4K.map(c=>{
  const source=c.older+c.previous+c.eol+'{:a}'+(c.trailing?c.eol:'');
  const lineStart=source.indexOf('{:a}');
  if(lineStart<=0||source[lineStart-1]!=='\n')throw Error('P4K_FIXTURE_PREMISE');
  const prevNewline=source.lastIndexOf('\n',lineStart-2);
  const prevLineStart=prevNewline===-1?0:prevNewline+1;
  const actual=source.slice(prevLineStart,lineStart).trim();
  return {id:c.id,line_start:lineStart,prev_newline:prevNewline,computed_start:prevLineStart,
    slice_end:lineStart,actual_trimmed:actual,expected_trimmed:c.previous.trim()};
});
console.log('P4K_PREDICATE_TRACE '+JSON.stringify({schema:1,packet_sha256:expectedHash,
  method:'fixed_predicates_no_historical_execution',filter_cases:filterCases,
  original_filter_mismatches:filterCases.filter(c=>c.original!==c.expected).map(c=>c.id),
  applied_filter_mismatches:filterCases.filter(c=>c.applied!==c.expected).map(c=>c.id),
  applied_previous_cases:previousCases,
  applied_previous_mismatches:previousCases.filter(c=>c.actual_trimmed!==c.expected_trimmed).map(c=>c.id),
  reused_original_l1_mismatches:packet.prior_l1_trace.trace.mismatches,
  scope:'two_predicates_only_not_full_function_parser_DOM_or_FT_acceptance'}));
