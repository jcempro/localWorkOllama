import { promises as fs } from "node:fs";
import path from "node:path";
import { listJobs, jobDir, getState, setState, alive, readJson, atomicText, atomicJson } from "./job-store.mjs";
import { deliver, notify } from "./delivery.mjs";

const now = Date.now();
for (const id of await listJobs()) {
  try {
    const dir = jobDir(id);
    const state = await getState(id);
    if (["QUEUED", "RUNNING"].includes(state.status)) {
      const last = Date.parse(state.heartbeat_at ?? state.created_at);
      if (now - last > 120_000 && !alive(state.pid)) {
        await atomicText(path.join(dir, "error.txt"), "WORKER_INFRA_ERROR: runner ausente após heartbeat vencido.\n");
        await setState(id, { ...state, status: "FAILED", error_kind: "WORKER_INFRA_ERROR", completed_at: new Date().toISOString() });
      } else continue;
    }
    const delivery = await readJson(path.join(dir, "delivery.json"));
    if (delivery.status === "STARTED" && !alive(delivery.pid)) {
      await atomicText(path.join(dir, "delivery-error.txt"), "Envio ao chat iniciado; processo de entrega ausente. Estado ambíguo: sem retry automático.\n");
      await atomicJson(path.join(dir, "delivery.json"), { status: "AMBIGUOUS", reason: "entrega interrompida após início do envio ao chat" });
      await notify("localWorker: entrega ambígua", `Job ${id}: inspecione o chat antes de qualquer nova tentativa.`, "error");
      continue;
    }
    if (delivery.status !== "PENDING") continue;
    const lock = path.join(dir, "delivery.lock");
    try {
      const held = await readJson(lock);
      if (alive(held.pid)) continue;
      await fs.rm(lock, { force: true });
    } catch (error) {
      if (error?.code !== "ENOENT") {
        const stat = await fs.stat(lock).catch(() => null);
        if (!stat || now - stat.mtimeMs < 120_000) continue;
        await fs.rm(lock, { force: true });
      }
    }
    await deliver(id);
  } catch (error) {
    console.error(`watchdog ${id}: ${error?.stack ?? error}`);
  }
}
