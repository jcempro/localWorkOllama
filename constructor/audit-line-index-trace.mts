// R9T: instrumento interno factual. Apenas leitura e stdout; nenhum código histórico é executado.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_PACKET_BYTES_R9T=16384;
const MAX_FRAGMENT_CHARS_R9T=4096;
const LF_R9T='\n';
const MARKER_R9T='{:a}';
const EXPRESSIONS_R9T=[
  'let prevLineStart = 0;',
  String.raw`const prevNewline = source.lastIndexOf('\n', lineStart - 1);`,
  'prevLineStart = prevNewline === -1 ? 0 : prevNewline + 1;',
  'const prevLineText = source.slice(prevLineStart, lineStart - (lineEnd === -1 ? 0 : 1));',
  "if (prevLineText.trim() !== '') {",
];
const CASES_R9T=[
  {id:'LF_final',older:'',previous:'x',eol:'\n',trailing:false},
  {id:'LF_nonfinal',older:'old\n',previous:'x',eol:'\n',trailing:true},
  {id:'CRLF_final',older:'',previous:'x',eol:'\r\n',trailing:false},
  {id:'UTF16_CRLF',older:'old\r\n',previous:'😀x',eol:'\r\n',trailing:true},
  {id:'blank_control',older:'',previous:' ',eol:'\n',trailing:false},
];

const [packetInput,expectedHash,...extra]=process.argv.slice(2);
if(!packetInput||!/^[a-f0-9]{64}$/.test(expectedHash??'')||extra.length)throw Error('R9T_ARGS: <packet> <sha256>');
const root=await fs.realpath(process.cwd());
const packetPath=await fs.realpath(packetInput);
if(!packetPath.toLowerCase().startsWith((root+path.sep).toLowerCase()))throw Error('R9T_OUTSIDE_REPO');
const stat=await fs.lstat(packetInput);
if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_PACKET_BYTES_R9T)throw Error('R9T_PACKET_BOUNDARY');
const bytes=await fs.readFile(packetPath);
if(createHash('sha256').update(bytes).digest('hex')!==expectedHash)throw Error('R9T_PACKET_HASH');
const packet=JSON.parse(bytes.toString('utf8'));
const fragment=packet.proposal_previous_line;
if(typeof fragment!=='string'||fragment.length>MAX_FRAGMENT_CHARS_R9T)throw Error('R9T_FRAGMENT');
const lines=fragment.split('\n').map(line=>line.trim());
for(const expression of EXPRESSIONS_R9T){
  if(lines.filter(line=>line===expression).length!==1)throw Error('R9T_EXPRESSION_NOT_RECOGNIZED');
}

// Tradução fixa das expressões conferidas acima. Não usar eval/vm/Function/import de evidência.
const cases=CASES_R9T.map(c=>{
  const source=c.older+c.previous+c.eol+MARKER_R9T+(c.trailing?c.eol:'');
  const lineStart=source.indexOf(MARKER_R9T);
  if(lineStart<=0||source[lineStart-1]!==LF_R9T||source.lastIndexOf(MARKER_R9T)!==lineStart)throw Error('R9T_FIXTURE_PREMISE');
  const lineEnd=source.indexOf(LF_R9T,lineStart);
  const prevNewline=source.lastIndexOf(LF_R9T,lineStart-1);
  const prevLineStart=prevNewline===-1?0:prevNewline+1;
  const sliceEnd=lineStart-(lineEnd===-1?0:1);
  const actualPrevious=source.slice(prevLineStart,sliceEnd);
  const actualAccepted=actualPrevious.trim()!=='';
  const expectedAccepted=c.previous.trim()!==''; // conteúdo esperado dado pelo caso, não calculado pelo snippet
  return {id:c.id,line_start:lineStart,line_end:lineEnd,prev_newline:prevNewline,
    computed_start:prevLineStart,slice_end:sliceEnd,actual_previous:actualPrevious,
    expected_previous:c.previous,actual_accepted:actualAccepted,expected_accepted:expectedAccepted};
});
console.log('R9T_INDEX_TRACE '+JSON.stringify({schema:1,source_field:'proposal_previous_line',packet_sha256:expectedHash,
  expressions_matched:EXPRESSIONS_R9T.length,method:'fixed_arithmetic_no_historical_execution',cases,
  mismatches:cases.filter(c=>c.actual_accepted!==c.expected_accepted).map(c=>c.id),
  scope:'L1_only_under_declared_LF_premise_not_full_function_or_parser_test'}));
