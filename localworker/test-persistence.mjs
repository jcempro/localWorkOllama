import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import {randomUUID} from 'node:crypto';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'worker-persistence-'));
const source=path.join(path.dirname(fileURLToPath(import.meta.url)),'job-store.mjs');
try{
  await fs.copyFile(source,path.join(root,'job-store.mjs'));
  const store=await import(pathToFileURL(path.join(root,'job-store.mjs')));
  const id=randomUUID(),dir=store.jobDir(id);
  await fs.mkdir(dir,{recursive:true});
  await store.setState(id,{job_id:id,status:'FAILED'});
  await fs.writeFile(path.join(root,'active.json'),Buffer.alloc(75));
  assert.equal(await store.activeJob(),null);
  assert.equal((await store.readJson(path.join(root,'active.json'))).job_id,null);
  await fs.writeFile(path.join(dir,'delivery.json'),Buffer.alloc(26));
  const delivery=await store.readDelivery(id);
  assert.equal(delivery.status,'AMBIGUOUS');
  assert.deepEqual(await fs.readFile(path.join(dir,delivery.preserved_artifact)),Buffer.alloc(26));
  assert.deepEqual(await store.readDelivery(id),delivery);
  await store.setState(id,{job_id:id,status:'RUNNING'});
  await fs.writeFile(path.join(root,'active.json'),Buffer.alloc(75));
  assert.equal(await store.activeJob(),id);
  const other=randomUUID();await fs.mkdir(store.jobDir(other));await store.setState(other,{job_id:other,status:'RUNNING'});
  await fs.writeFile(path.join(root,'active.json'),Buffer.alloc(75));
  await assert.rejects(store.activeJob(),/multiplos jobs ativos/);
  console.log('PASS: indice corrompido, estados terminais/ativos, ambiguidade preservada, evidencia integra e sem replay');
}finally{
  // Fixture proprio verificado no temporario, nenhum path de usuario incluido.
  const actual=await fs.realpath(root);
  assert.equal(path.dirname(actual).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase());
  await fs.rm(actual,{recursive:true,force:true});
}
