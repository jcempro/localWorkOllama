// CLI interno read-only. Node22.13+, --experimental-strip-types.
// --root <raiz Git> --input <JSON relativo> --field <campo textual> [--origin-field <campo>] [--sha256 <hash esperado>]
// stdout JSON; exit2 uso/entrada inválida, exit1 falha operacional. Sem rede/escrita.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {extractDiffFactsD9F,LIMIT_DIFF_CHARS_D9F} from './diff-facts.mts';
const LIMIT_JSON_BYTES_D9F=4_000_000;
try{
  const args=process.argv.slice(2),options:Record<string,string>={};
  if(args.length%2)throw Error('ARGUMENTS_INVALID');
  for(let i=0;i<args.length;i+=2){if(!['--root','--input','--field','--origin-field','--sha256'].includes(args[i])||options[args[i]])throw Error('ARGUMENTS_INVALID');options[args[i]]=args[i+1];}
  if(!options['--root']||!options['--input']||!options['--field'])throw Error('ARGUMENTS_REQUIRED');
  for(const key of ['--field','--origin-field'])if(options[key]&&!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(options[key]))throw Error('FIELD_INVALID');
  const root=path.resolve(options['--root']);
  if((await fs.realpath(root)).toLowerCase()!==root.toLowerCase())throw Error('ROOT_REDIRECTED');
  await fs.lstat(path.join(root,'.git'));
  const relative=options['--input'];
  if(path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>!p||['.','..','.git'].includes(p))||relative.includes(':'))throw Error('INPUT_PATH_INVALID');
  const file=path.resolve(root,relative),parts=relative.split(/[\\/]/);
  let cursor=root;
  for(let i=0;i<parts.length;i++){
    cursor=path.join(cursor,parts[i]);const info=await fs.lstat(cursor);
    if(info.isSymbolicLink())throw Error('INPUT_REDIRECTED');
    if(i<parts.length-1){if(!info.isDirectory())throw Error('INPUT_PARENT_INVALID');if(await fs.lstat(path.join(cursor,'.git')).catch((e:any)=>{if(e.code==='ENOENT')return null;throw e;}))throw Error('NESTED_REPOSITORY');}
    else if(!info.isFile()||info.nlink!==1||info.size>LIMIT_JSON_BYTES_D9F)throw Error('INPUT_FILE_INVALID');
  }
  const bytes=await fs.readFile(file);if(bytes.length>LIMIT_JSON_BYTES_D9F)throw Error('INPUT_FILE_INVALID');
  const inputHash=createHash('sha256').update(bytes).digest('hex');
  if(options['--sha256']&&(!/^[a-f0-9]{64}$/.test(options['--sha256'])||options['--sha256']!==inputHash))throw Error('INPUT_HASH_MISMATCH');
  const input=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
  if(!input||Array.isArray(input)||typeof input!=='object'||!Object.hasOwn(input,options['--field']))throw Error('INPUT_OBJECT_INVALID');
  const text=input[options['--field']];if(typeof text!=='string'||text.length>LIMIT_DIFF_CHARS_D9F)throw Error('INPUT_TEXT_INVALID');
  let origin:string|null=null;
  if(options['--origin-field']){origin=input[options['--origin-field']];if(!Object.hasOwn(input,options['--origin-field'])||typeof origin!=='string'||origin.length>4096)throw Error('ORIGIN_INVALID');}
  const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
  console.log(JSON.stringify({input_sha256:inputHash,fragment_sha256:hash(text),field:options['--field'],origin_literal:origin,...extractDiffFactsD9F(text)}));
}catch(error:any){console.error(String(error.message).slice(0,240));process.exitCode=error.code?1:2;}
