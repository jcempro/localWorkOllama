import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const JOBS = path.join(ROOT, "jobs");
export const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function jobDir(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("job_id inválido");
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
    await fs.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
    await replaceFile(tmp, file);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

export async function atomicText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, String(value), { flag: "wx" });
    await replaceFile(tmp, file);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

export async function getState(id) {
  return readJson(path.join(jobDir(id), "state.json"));
}

export async function setState(id, state) {
  await atomicJson(path.join(jobDir(id), "state.json"), state);
}

export function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

const activeFile = path.join(ROOT, "active.json");
export async function activeJob() {
  try {
    const active = await readJson(activeFile);
    const state = await getState(active.job_id);
    return TERMINAL.has(state.status) ? null : active.job_id;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
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
    const job_id = randomUUID();
    const dir = jobDir(job_id);
    await fs.mkdir(dir);
    await atomicJson(path.join(dir, "request.json"), request);
    await setState(job_id, { job_id, status: "QUEUED", created_at: new Date().toISOString(), pid: null, heartbeat_at: null });
    await atomicJson(path.join(dir, "delivery.json"), { status: "PENDING" });
    await atomicJson(activeFile, { job_id });
    return { busy: false, job_id };
  } finally {
    await handle.close();
    await fs.rm(path.join(ROOT, "create.lock"), { force: true });
  }
}

export async function listJobs() {
  try { return (await fs.readdir(JOBS)).filter(x => /^[0-9a-f-]{36}$/i.test(x)); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
}

export async function recordLatency(seconds) {
  const file = path.join(ROOT, "latency.json");
  let recent = [];
  try { recent = (await readJson(file)).seconds ?? []; }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  recent = [...recent, seconds].slice(-100);
  await atomicJson(file, { seconds: recent, average_seconds: recent.reduce((a, b) => a + b, 0) / recent.length });
}
