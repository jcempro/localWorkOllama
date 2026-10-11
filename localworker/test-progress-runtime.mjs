import { createServer } from "node:http";
import assert from "node:assert/strict";
import path from "node:path";
const repo=process.env.TEST_REPO_PATH;
if(!repo || path.basename(path.resolve(repo)).toLowerCase()!=="jeancarloem.com.blog") throw Error("Defina TEST_REPO_PATH para o blog autorizado");
let requests=0, scenario="repeat";
let hinted=false;
const server=createServer(async(req,res)=>{
  let body='';for await(const chunk of req) {body+=chunk} requests++;
  if(scenario==='hint'&&JSON.parse(body).messages.some(m=>m.role==='user'&&m.content.startsWith('ADAPTACAO OPERACIONAL:')))hinted=true;
  const alternative=scenario==="adapt"&&requests===2||scenario==='hint'&&hinted&&requests===4;
  const final=scenario==="adapt"&&requests===3||scenario==='hint'&&requests===5;
  res.setHeader("Content-Type","application/json");
  res.end(JSON.stringify({message:{role:"assistant",content:final?"Diagnóstico obtido pela alternativa autorizada.":"",
    ...(final?{}:{tool_calls:[{function:alternative?{name:"git_status",arguments:{}}:['adapt','hint'].includes(scenario)?{name:"run_command",arguments:{program:"unsupported",args:[]}}:{name:"run_authorized_command",arguments:{id:"fail"}}}]})}}));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
process.env.OLLAMA_URL=`http://127.0.0.1:${server.address().port}`;
process.env.LOCAL_MODEL="fake-loop-regression";
try {
 const {runLocalAnalysis}=await import("./worker-core.mjs");
 const commands=[{id:"fail",program:process.execPath,args:["-e","process.stderr.write('assertion failed');process.exit(1)"],description:"Teste isolado de erro determinístico",timeout_ms:5000}];
 const events=[];
 await assert.rejects(runLocalAnalysis(repo,"Teste somente leitura de proteção contra loop.","write",e=>events.push(e),commands),/ausência de progresso/);
 assert.ok(requests<10);
 assert.equal(events.filter(e=>e.phase==="tool_result"&&e.outcome==="error").length,1);
 assert.ok(events.some(e=>e.phase==="strategy_blocked"&&e.sequence));
 assert.ok(events.some(e=>e.phase==='strategy_adaptation'));
 scenario="adapt";requests=0;
 const answer=await runLocalAnalysis(repo,"Teste somente leitura; diagnostique por alternativa permitida.","write",()=>{},commands);
 assert.match(answer,/alternativa autorizada/);
 assert.equal(requests,3);
 scenario='hint';requests=0;hinted=false;
 const recovered=await runLocalAnalysis(repo,'Teste de adaptacao orientada a evidencia, sem mudancas.', 'write',()=>{},commands);
 assert.match(recovered,/alternativa autorizada/);assert.equal(hinted,true);assert.equal(requests,5);
 console.log("runtime: execução repetida bloqueada; alternativa executada; diagnóstico antecipado OK");
} finally {server.close();}
