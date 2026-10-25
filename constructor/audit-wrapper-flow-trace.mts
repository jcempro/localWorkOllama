// G6B: contraprovas de predicados fixos próprios; fonte histórica é somente dado.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [packetPathG6B,packetHashG6B]=process.argv.slice(2);
const rawG6B=fs.readFileSync(packetPathG6B),hashG6B=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
assert.equal(hashG6B(rawG6B),packetHashG6B);
const packetG6B=JSON.parse(rawG6B.toString('utf8')),proposalG6B=packetG6B.proposals['8d1685c6'],sourceG6B=proposalG6B.source;
assert.equal(hashG6B(sourceG6B),proposalG6B.provenance.source_sha256);
const fragmentsG6B=['if (pairs.length === 0) return ast;',
 'ialIndexSetByBlock.set(pair.blockIndex, set);','set.add(pair.ialIndex);',
 'const blockIndex = i - 1;','const set = ialIndexSetByBlock.get(blockIndex);',
 'if (set && set.has(i)) {\n      // omitir nós cujo índice esteja em ialIndex\n      continue;\n    }',
 'if (set && set.has(i - 1)) {','newChildren[newChildren.length - 1] = {','newChildren.push(child);'];
for(const text of fragmentsG6B){const start=sourceG6B.indexOf(text);assert(start>=0&&sourceG6B.indexOf(text,start+1)<0,'G6B_UNKNOWN_OR_NONUNIQUE_EXPRESSION');}
assert(sourceG6B.indexOf(fragmentsG6B[5])<sourceG6B.indexOf(fragmentsG6B[6]));
const casesG6B=[
 {name:'start_pair',children:['B0','I1','X2'],pairs:[[0,1]],expected:['WRAP_B0','X2']},
 {name:'later_pair',children:['X0','X1','B2','I3','X4'],pairs:[[2,3]],expected:['X0','X1','WRAP_B2','X4']},
 {name:'two_pairs',children:['B0','I1','B2','I3','X4'],pairs:[[0,1],[2,3]],expected:['WRAP_B0','WRAP_B2','X4']},
 {name:'no_pairs',children:['X0','X1'],pairs:[],expected:['X0','X1']}
];
const resultsG6B=casesG6B.map(fixture=>{
 const map=new Map<number,Set<number>>();
 for(const [blockIndex,ialIndex] of fixture.pairs){assert.equal(ialIndex,blockIndex+1);assert(ialIndex<fixture.children.length);
  const set=map.get(blockIndex)??new Set<number>();set.add(ialIndex);map.set(blockIndex,set);}
 const actual:string[]=[],actions:any[]=[];
 if(!fixture.pairs.length){actual.push(...fixture.children);}
 else for(let i=0;i<fixture.children.length;i++){
  const lookup=i-1,set=map.get(lookup);
  if(set&&set.has(i)){actions.push({i,lookup,action:'omit'});continue;}
  if(set&&set.has(i-1))throw Error('G6B_WRAPPER_BRANCH_REACHED_OUTSIDE_RECOGNIZED_SCOPE');
  actions.push({i,lookup,action:'push'});actual.push(fixture.children[i]);
 }
 const matches=JSON.stringify(actual)===JSON.stringify(fixture.expected);
 assert.equal(matches,fixture.pairs.length===0);
 assert.equal(actual.filter(v=>v.startsWith('WRAP_')).length,0);
 return {name:fixture.name,adjacent_pairs:fixture.pairs,actions,actual,expected:fixture.expected,matches,wrapper_branch_entries:0};
});
console.log('G6B_WRAPPER_TRACE '+JSON.stringify({packet_sha256:packetHashG6B,results:resultsG6B,
 scope:'recognized_adjacent_pair_predicates_only',historical_code_executed:false,historical_tests_repeated:false,
 full_helper_validated:false,application_receipt_is_not_proposal_acceptance:true}));
