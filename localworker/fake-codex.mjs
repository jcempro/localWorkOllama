import { promises as fs } from "node:fs";
const args = process.argv.slice(2);
if (args[0] !== "queue") process.exit(2);
const thread = args[args.indexOf("--thread") + 1];
const message = args[args.indexOf("--message") + 1];
const repo = args[args.indexOf("-C") + 1];
if (!thread || !message?.includes("localWorker") || !repo || !process.env.LOCAL_FAKE_QUEUE_LOG) process.exit(3);
await fs.appendFile(process.env.LOCAL_FAKE_QUEUE_LOG, JSON.stringify({ thread, message, repo }) + "\n");
process.stdout.write("Queued message fake for thread " + thread + "\n");
