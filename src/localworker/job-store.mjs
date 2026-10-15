import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const JOBS = path.join(ROOT, "jobs");
export const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const resolvedForRetentionU6C = delivery => delivery.status === "QUEUED_TO_CHAT" || delivery.status === "PAUSED_USER" && delivery.not_sent === true;
const JOB_ID_J4R = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const HISTORY_DAYS_J4R = Number(process.env.LOCAL_WORKER_HISTORY_DAYS ?? 90);
const HISTORY_MAX_JOBS_J4R = Number(process.env.LOCAL_WORKER_HISTORY_MAX_JOBS ?? 500);
const HISTORY_MAX_BYTES_J4R = Number(process.env.LOCAL_WORKER_HISTORY_MAX_BYTES ?? 536870912);
const HISTORY_MAX_TOTAL_JOBS_J4R = Number(process.env.LOCAL_WORKER_HISTORY_MAX_TOTAL_JOBS ?? 1000);
const HISTORY_CLEANUP_INTERVAL_MS_J4R = 6 * 60 * 60 * 1000;

export function jobDir(id) {
  if (!JOB_ID_J4R.test(id)) throw new Error("job_id inválido");
  return path.join(JOBS, id);
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function replaceFile(temp, file) {
  for (let attempt = 0; ; attempt++) {
    try { await fs.rename(temp, file); return; }
    catch (error) {
      if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(error?.code) || attempt >= 19) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 + attempt * 25));
    }
  }
}

export async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const handle = await fs.open(tmp, "wx");
    try { await handle.writeFile(JSON.stringify(value, null, 2) + "\n"); await handle.sync(); }
    finally { await handle.close(); }
    await replaceFile(tmp, file);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

export async function atomicText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const handle = await fs.open(tmp, "wx");
    try { await handle.writeFile(String(value)); await handle.sync(); }
    finally { await handle.close(); }
    await replaceFile(tmp, file);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

export async function getState(id) {
  return readJson(path.join(jobDir(id), "state.json"));
}

// Perda/corrupcao de recibo nunca prova que uma mensagem nao foi enviada.
export async function readDelivery(id) {
  const file=path.join(jobDir(id),"delivery.json");
  try {
    const delivery=await readJson(file);
    if(typeof delivery?.status!=="string")throw new SyntaxError("delivery schema invalid");
    return delivery;
  }catch(error){
    if(!(error instanceof SyntaxError))throw error;
    const bytes=await fs.readFile(file);
    const hash=createHash("sha256").update(bytes).digest("hex");
    const preserved=path.join(jobDir(id),`delivery.corrupt-${hash}.bin`);
    try{const h=await fs.open(preserved,"wx");try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}}
    catch(e){if(e.code!=="EEXIST")throw e;if(!bytes.equals(await fs.readFile(preserved)))throw new Error("Corrupt delivery backup mismatch");}
    const recovered={status:"AMBIGUOUS",reason:"DELIVERY_ARTIFACT_CORRUPTED; envio historico desconhecido; sem retry automatico",
      recovered_at:new Date().toISOString(),artifact_sha256:hash,preserved_artifact:path.basename(preserved)};
    await atomicJson(file,recovered);
    await atomicText(path.join(jobDir(id),"delivery-error.txt"),`${recovered.reason}\nEvidencia: ${recovered.preserved_artifact}\n`);
    return recovered;
  }
}

export async function setState(id, state) {
  await atomicJson(path.join(jobDir(id), "state.json"), state);
}

export function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function activeJob(runtimeRoot = ROOT) {
  const actual=await fs.realpath(runtimeRoot);
  if(path.resolve(actual).toLowerCase()!==path.resolve(runtimeRoot).toLowerCase()||(await fs.lstat(runtimeRoot)).isSymbolicLink())throw Error('Raiz de recuperacao redirecionada');
  const activeFile=path.join(runtimeRoot,'active.json');
  const jobsDir=path.join(runtimeRoot,'jobs');
  try {
    const active = await readJson(activeFile);
    // Ausencia e o formato vazio aceito tambem pelos servidores MCP legados.
    // Migrar null evita getState(null) em um processo ainda carregado em memoria.
    if(active.job_id===null){await fs.rm(activeFile,{force:true});return null;}
    if(!JOB_ID_J4R.test(active.job_id??''))throw new SyntaxError('active schema invalid');
    const state = await readJson(path.join(jobsDir,active.job_id,'state.json'));
    return TERMINAL.has(state.status) ? null : active.job_id;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if(error instanceof SyntaxError){
      // Indice reconstruivel; estados de jobs sao a autoridade, nunca replay.
      const bytes=await fs.readFile(activeFile);
      const hash=createHash('sha256').update(bytes).digest('hex');
      const backup=path.join(runtimeRoot,`active.corrupt-${hash}.bin`);
      try{const h=await fs.open(backup,'wx');try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}}
      catch(e){if(e.code!=='EEXIST')throw e;if(!bytes.equals(await fs.readFile(backup)))throw Error('Active backup mismatch');}
      const candidates=[];
      for(const id of (await fs.readdir(jobsDir)).filter(id=>JOB_ID_J4R.test(id))){
        const state=await readJson(path.join(jobsDir,id,'state.json'));
        if(state.job_id!==id||!['QUEUED','RUNNING',...TERMINAL].includes(state.status))throw Error(`WORKER_INFRA_ERROR: estado invalido em ${id}; indice nao reconstruido`);
        if(!TERMINAL.has(state.status))candidates.push(id);
      }
      if(candidates.length>1)throw Error('WORKER_INFRA_ERROR: multiplos jobs ativos; indice nao reconstruido');
      const id=candidates[0]??null;
      if(id)await atomicJson(activeFile,{job_id:id,recovered_at:new Date().toISOString(),prior_sha256:hash,preserved_artifact:path.basename(backup)});
      else await fs.rm(activeFile,{force:true}); // Backup sincronizado preserva a evidencia.
      return id;
    }
    throw error;
  }
}

export async function createJob(request) {
  await fs.mkdir(JOBS, { recursive: true });
  let handle;
  try {
    handle = await fs.open(path.join(ROOT, "create.lock"), "wx");
  } catch (error) {
    if (error?.code === "EEXIST") return { busy: true, job_id: await activeJob() };
    throw error;
  }
  try {
    const current = await activeJob();
    if (current) return { busy: true, job_id: current };
    if (!Number.isSafeInteger(HISTORY_MAX_TOTAL_JOBS_J4R) || HISTORY_MAX_TOTAL_JOBS_J4R < 1) {
      throw new Error("LOCAL_WORKER_HISTORY_MAX_TOTAL_JOBS inválido");
    }
    if ((await listJobs()).length >= HISTORY_MAX_TOTAL_JOBS_J4R) {
      await pruneJobHistory({ force: true });
      if ((await listJobs()).length >= HISTORY_MAX_TOTAL_JOBS_J4R) {
        throw new Error(`WORKER_INFRA_ERROR: limite de ${HISTORY_MAX_TOTAL_JOBS_J4R} jobs retidos; preserve entregas pendentes/ambíguas e resolva-as antes de criar outro job.`);
      }
    }
    const job_id = randomUUID();
    const dir = jobDir(job_id);
    await fs.mkdir(dir);
    await atomicJson(path.join(dir, "request.json"), request);
    await setState(job_id, { job_id, status: "QUEUED", created_at: new Date().toISOString(), pid: null, heartbeat_at: null });
    await atomicJson(path.join(dir, "delivery.json"), { status: "PENDING" });
    await atomicJson(path.join(ROOT, "active.json"), { job_id });
    return { busy: false, job_id };
  } finally {
    await handle.close();
    await fs.rm(path.join(ROOT, "create.lock"), { force: true });
  }
}

export async function listJobs() {
  try { return (await fs.readdir(JOBS)).filter(x => JOB_ID_J4R.test(x)); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
}

export async function safeJobBytesJ4R(dir, context = false) {
  const info = await fs.lstat(dir);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("job não é diretório regular");
  let bytes = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!context && entry.name === "context" && entry.isDirectory() && !entry.isSymbolicLink()) {
      bytes += await safeJobBytesJ4R(path.join(dir, entry.name), true);
      continue;
    }
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error("Entrada não regular no job");
    bytes += (await fs.stat(path.join(dir, entry.name))).size;
  }
  return bytes;
}

export async function pruneJobHistory({ force = false, now = Date.now() } = {}) {
  for (const [name, value, min] of [["LOCAL_WORKER_HISTORY_DAYS", HISTORY_DAYS_J4R, 1],
    ["LOCAL_WORKER_HISTORY_MAX_JOBS", HISTORY_MAX_JOBS_J4R, 1],
    ["LOCAL_WORKER_HISTORY_MAX_BYTES", HISTORY_MAX_BYTES_J4R, 1048576]]) {
    if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name} inválido`);
  }
  const marker = path.join(ROOT, "history-cleanup.json");
  const prior = await readJson(marker).catch(() => null);
  if (!force && now - Date.parse(prior?.checked_at ?? "") < HISTORY_CLEANUP_INTERVAL_MS_J4R) return { skipped: true };
  await fs.mkdir(JOBS, { recursive: true });
  const lockPath = path.join(ROOT, "history-cleanup.lock");
  let lock;
  try { lock = await fs.open(lockPath, "wx"); }
  catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const held = await readJson(lockPath).catch(() => null);
    const lockStat = await fs.stat(lockPath).catch(() => null);
    const started = Date.parse(held?.started_at ?? "");
    const age = now - (Number.isFinite(started) ? started : lockStat?.mtimeMs ?? now);
    if (age < 600_000 || alive(held?.pid)) return { skipped: true, reason: "cleanup em curso" };
    await fs.rm(lockPath, { force: true });
    lock = await fs.open(lockPath, "wx").catch(next => { if (next?.code === "EEXIST") return null; throw next; });
    if (!lock) return { skipped: true, reason: "cleanup concorrente" };
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date(now).toISOString() }));
    const eligible = [];
    const errors = [];
    const removed = [];
    for (const entry of await fs.readdir(JOBS, { withFileTypes: true })) {
      const retiredId = /^\.retired-([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.exec(entry.name)?.[1];
      if (!retiredId) continue;
      try {
        const retiredDir = path.join(JOBS, entry.name);
        const [state, delivery] = await Promise.all([readJson(path.join(retiredDir, "state.json")),
          readJson(path.join(retiredDir, "delivery.json"))]);
        if (state.job_id !== retiredId || !TERMINAL.has(state.status) || !resolvedForRetentionU6C(delivery)) continue;
        await safeJobBytesJ4R(retiredDir);
        await fs.rm(retiredDir, { recursive: true, force: true });
        removed.push(retiredId);
      } catch (error) { errors.push({ job_id: retiredId, error: String(error?.message ?? error).slice(0, 200) }); }
    }
    for (const id of await listJobs()) {
      const dir = jobDir(id);
      try {
        const [state, delivery, bytes] = await Promise.all([
          getState(id), readJson(path.join(dir, "delivery.json")), safeJobBytesJ4R(dir),
        ]);
        if (state.job_id !== id || !TERMINAL.has(state.status) || !resolvedForRetentionU6C(delivery)) continue;
        const completed = Date.parse(state.completed_at ?? "");
        if (!Number.isFinite(completed) || completed > now) continue;
        eligible.push({ id, dir, completed, bytes });
      } catch (error) { errors.push({ job_id: id, error: String(error?.message ?? error).slice(0, 200) }); }
    }
    eligible.sort((a, b) => b.completed - a.completed);
    let retained = eligible.length;
    let totalBytes = eligible.reduce((sum, item) => sum + item.bytes, 0);
    for (const item of [...eligible].reverse()) {
      const expired = now - item.completed > HISTORY_DAYS_J4R * 86400000;
      if (!expired && retained <= HISTORY_MAX_JOBS_J4R && totalBytes <= HISTORY_MAX_BYTES_J4R) continue;
      try {
        const [state, delivery] = await Promise.all([getState(item.id), readJson(path.join(item.dir, "delivery.json"))]);
        if (state.job_id !== item.id || !TERMINAL.has(state.status) || !resolvedForRetentionU6C(delivery)) continue;
        await safeJobBytesJ4R(item.dir);
        const retired = path.join(JOBS, `.retired-${item.id}`);
        await fs.rename(item.dir, retired);
        await fs.rm(retired, { recursive: true, force: true });
        removed.push(item.id);
        retained--;
        totalBytes -= item.bytes;
      } catch (error) { errors.push({ job_id: item.id, error: String(error?.message ?? error).slice(0, 200) }); }
    }
    const summary = { checked_at: new Date(now).toISOString(), removed_count: removed.length, retained_delivered_jobs: retained,
      retained_delivered_bytes: Math.max(0, totalBytes), errors };
    await atomicJson(marker, summary);
    return summary;
  } finally {
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

export async function recordLatency(seconds) {
  const file = path.join(ROOT, "latency.json");
  let recent = [];
  try { recent = (await readJson(file)).seconds ?? []; }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  recent = [...recent, seconds].slice(-100);
  await atomicJson(file, { seconds: recent, average_seconds: recent.reduce((a, b) => a + b, 0) / recent.length });
}
