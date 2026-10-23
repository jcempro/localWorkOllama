// Extrator interno D9F: somente sintaxe/contagens; sem fs, inferência ou edição.
export const LIMIT_DIFF_CHARS_D9F=1_000_000;
const LIMIT_HUNKS_D9F=4096;
type HunkD9F={header_line:number;old:{start:number;count:number};next:{start:number;count:number};observed:{old_lines:number;new_lines:number;removed:number;added:number;context:number};complete:boolean};
export function extractDiffFactsD9F(text:string){
  if(typeof text!=='string'||text.length>LIMIT_DIFF_CHARS_D9F||text.includes('\0'))throw Error('DIFF_INPUT_INVALID');
  const lines=text.replace(/\r\n/g,'\n').split('\n');
  const hunks:HunkD9F[]=[],metadata:{line:number;kind:string;value:string|number}[]=[];
  let active:HunkD9F|null=null;
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(index===lines.length-1&&line==='')continue;
    if(line.startsWith('@@@')||/^diff --(?:cc|combined) /.test(line)||line==='GIT binary patch'||/^Binary files .* differ$/.test(line))throw Error('DIFF_FORMAT_UNSUPPORTED');
    if(line.startsWith('@@')){
      const match=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$/.exec(line);
      if(!match)throw Error('HUNK_HEADER_INVALID');
      const [oldStart,oldCount,newStart,newCount]=[Number(match[1]),Number(match[2]??1),Number(match[3]),Number(match[4]??1)];
      if(![oldStart,oldCount,newStart,newCount,oldStart+oldCount,newStart+newCount].every(Number.isSafeInteger))throw Error('HUNK_RANGE_INVALID');
      if(oldCount>0&&oldStart===0||newCount>0&&newStart===0)throw Error('HUNK_RANGE_INVALID');
      if(hunks.length>=LIMIT_HUNKS_D9F)throw Error('HUNK_LIMIT');
      active={header_line:index+1,old:{start:oldStart,count:oldCount},next:{start:newStart,count:newCount},observed:{old_lines:0,new_lines:0,removed:0,added:0,context:0},complete:oldCount===0&&newCount===0};
      hunks.push(active);continue;
    }
    if(line.startsWith('diff --git ')){active=null;metadata.push({line:index+1,kind:'file_header_raw',value:line.slice(11)});continue;}
    if(line==='\\ No newline at end of file')continue;
    if(active&&!active.complete){
      const prefix=line[0];
      if(![' ','-','+'].includes(prefix))throw Error('HUNK_BODY_INVALID');
      const o=active.observed;
      if(prefix===' '){o.context++;o.old_lines++;o.new_lines++;}
      if(prefix==='-'){o.removed++;o.old_lines++;}
      if(prefix==='+'){o.added++;o.new_lines++;}
      if(o.old_lines>active.old.count||o.new_lines>active.next.count)throw Error('HUNK_COUNT_OVERFLOW');
      active.complete=o.old_lines===active.old.count&&o.new_lines===active.next.count;continue;
    }
    const rename=/^(rename from|rename to) (.+)$/.exec(line);
    if(rename){metadata.push({line:index+1,kind:rename[1]==='rename from'?'rename_from_raw':'rename_to_raw',value:rename[2]});continue;}
    const similarity=/^similarity index (\d+)%$/.exec(line);
    if(similarity){const value=Number(similarity[1]);if(value>100)throw Error('SIMILARITY_INVALID');metadata.push({line:index+1,kind:'similarity_index',value});continue;}
    if(active&&/^[ +\-]/.test(line)&&!/^--- |^\+\+\+ /.test(line))throw Error('HUNK_COUNT_OVERFLOW');
  }
  return {schema:'constructor-diff-facts/v1',hunks,metadata,
    hunk_counts_complete:hunks.length? hunks.every(h=>h.complete):null,
    availability:hunks.length?'HUNK_RANGES_OBSERVED':'NO_HUNK_HEADER',
    whole_file_sizes:null,fragment_coverage_percent:null,
    limits:'Intervalos de hunk e linhas observadas; não comprovam tamanhos totais, cobertura do arquivo, autoria ou completude editorial. Paths raw não são decodificados. Proveniência não é inferida.'};
}
