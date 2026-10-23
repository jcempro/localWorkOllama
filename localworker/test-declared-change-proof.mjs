import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const exec = promisify(execFile);
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") throw Error("Use somente o alvo autorizado");
const root = await fs.realpath(repo), parent = path.join(root, "tmp");
assert.equal((await fs.realpath(parent)).toLowerCase(), parent.toLowerCase(), "temporário confinado");
const name = `localworker-f7p-${randomUUID()}`, folder = path.join(parent, name);
const git = (await exec("where.exe", ["git.exe"], {windowsHide:true})).stdout.trim().split(/\r?\n/)[0];
const status = () => exec(git, ["-C", repo, "status", "--porcelain=v1", "-uall"], {windowsHide:true});
const baseline = (await status()).stdout;
await fs.mkdir(folder);
const relative = file => `tmp/${name}/${file}`;
const local = file => path.join(folder, file);
const events = [];
let assertions = 0;
let calls = 0, server;
process.env.LOCAL_MODEL = "fake-declared-progress";
server = createServer(async (req,res) => {
  for await(const _ of req){}
  if(req.url==="/api/ps"){res.end('{"models":[]}');return;}
  calls++;
  res.setHeader("Content-Type","application/json");
  res.end(JSON.stringify({message:calls<=5?{role:"assistant",content:"",tool_calls:[{function:{name:"run_authorized_command",arguments:{id:"counter"}}}]}:
    {role:"assistant",content:"RESULTADO: cinco alterações líquidas observadas."}}));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
process.env.OLLAMA_URL=`http://127.0.0.1:${server.address().port}`;
const {runLocalAnalysis} = await import("./worker-core.mjs");
const run = async (id, source, required, extra = {}) => {
  const command = {id,program:process.execPath,args:["-e",source,folder],mode:"write",network:false,repeatable:false,timeout_ms:10000};
  return runLocalAnalysis(repo,"Teste determinístico isolado de mudança declarada; commit supervisor.","write",e=>events.push(e),[command],true,required.map(relative),false,0,1,
    {command_sequence:[id],required_command_ids:[id],...extra});
};
const prelude = "const fs=require('node:fs'),p=require('node:path'),d=process.argv[1];";
try {
  await exec(git,["-C",repo,"check-ignore","--",relative("created.json")],{windowsHide:true});
  const created = await run("create",prelude+"fs.writeFileSync(p.join(d,'created.json'),'report-v1',{flag:'wx'});console.log('CREATED');",["created.json"]);
  assert.match(created,/CREATED/); assert.equal(await fs.readFile(local("created.json"),"utf8"),"report-v1"); assertions++;
  assert(events.some(e=>e.phase==="completion_verified"&&e.declared_changes_verified===true&&e.git_unchanged===true&&e.mutations===1)); assertions++;
  assert(events.some(e=>e.phase==="tool_result"&&e.progress===true)); assertions++;

  assert.match(await run("update",prelude+"fs.writeFileSync(p.join(d,'created.json'),'report-v2');console.log('UPDATED');",["created.json"]),/UPDATED/); assertions++;
  await assert.rejects(run("identical",prelude+"fs.writeFileSync(p.join(d,'created.json'),'report-v2');",["created.json"]),/alteração obrigatória não comprovada/); assertions++;
  await assert.rejects(run("read",prelude+"fs.readFileSync(p.join(d,'created.json'));",["created.json"]),/alteração obrigatória não comprovada/); assertions++;
  await assert.rejects(run("revert",prelude+"fs.writeFileSync(p.join(d,'created.json'),'temporary');fs.writeFileSync(p.join(d,'created.json'),'report-v2');",["created.json"]),/alteração obrigatória não comprovada/); assertions++;
  await assert.rejects(run("other",prelude+"fs.writeFileSync(p.join(d,'other.json'),'other');",["missing.json"]),/caminhos inalterados:.*missing\.json/); assertions++;
  await assert.rejects(run("partial",prelude+"fs.writeFileSync(p.join(d,'partial.json'),'partial');",["partial.json","missing.json"]),/missing\.json/); assertions++;
  await assert.rejects(run("failed",prelude+"fs.writeFileSync(p.join(d,'failed.json'),'partial-effect');process.exit(2);",["failed.json"]),/comando determinístico failed falhou/); assertions++;
  assert.equal(await fs.readFile(local("failed.json"),"utf8"),"partial-effect","efeito parcial preservado"); assertions++;
  await assert.rejects(run("undeclared",prelude+"fs.writeFileSync(p.join(d,'undeclared.json'),'undeclared');",[]),/alteração obrigatória não comprovada/); assertions++;
  // Mesmo comando/saída, mas conteúdo muda: a guarda deve observar progresso real.
  await fs.writeFile(local("counter.json"),"0",{flag:"wx"});
  const progressEvents=[];
  const counter={id:"counter",program:process.execPath,args:["-e",prelude+"const f=p.join(d,'counter.json');fs.writeFileSync(f,String(Number(fs.readFileSync(f,'utf8'))+1));console.log('constant-output');",folder],mode:"write",network:false,repeatable:true,timeout_ms:10000};
  assert.match(await runLocalAnalysis(repo,"Teste de progresso real em alvo declarado ignorado.","write",e=>progressEvents.push(e),[counter],true,[relative("counter.json")],false),/cinco alterações/); assertions++;
  assert.equal(calls,6); assert.equal(await fs.readFile(local("counter.json"),"utf8"),"5"); assertions++;
  assert.equal(progressEvents.filter(e=>e.phase==="tool_result"&&e.progress===true).length,5); assertions++;
  assert(!progressEvents.some(e=>e.phase==="strategy_blocked")); assertions++;
  assert.equal((await status()).stdout,baseline,"nenhuma alteração Git herdada foi substituída"); assertions++;
  console.log(JSON.stringify({result:"F7P_OK",assertions,simulated_ollama_requests:calls,real_inference:false,git_unchanged:true}));
} finally {
  server.close();
  // Somente conteúdo exclusivo conhecido; não remover recursivamente nem apagar divergências.
  const expected = new Map([["created.json","report-v2"],["other.json","other"],["partial.json","partial"],["failed.json","partial-effect"],["undeclared.json","undeclared"],["counter.json","5"]]);
  assert.equal((await fs.realpath(folder)).toLowerCase(),folder.toLowerCase());
  for(const entry of await fs.readdir(folder,{withFileTypes:true})) {
    assert(entry.isFile()&&expected.has(entry.name),"fixture divergente: preservar");
    assert.equal(await fs.readFile(local(entry.name),"utf8"),expected.get(entry.name),"conteúdo divergente: preservar");
  }
  for(const entry of await fs.readdir(folder))await fs.unlink(local(entry));
  await fs.rmdir(folder);
  assert.equal((await status()).stdout,baseline,"Git deve permanecer no estado inicial");
}
