/**
 * Run the CMS as a detached service: its own session and process group,
 * output to data/cms.log, pid in data/cms.pid. A terminal closing or a
 * parent job being reaped cannot take it down; only `stop` can.
 *
 *   node scripts/cms.mjs start | stop | restart | status
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PID = path.join(ROOT, "data/cms.pid");
const LOG = path.join(ROOT, "data/cms.log");
const cmd = process.argv[2] || "status";

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
const running = () => { try { const pid = Number(fs.readFileSync(PID, "utf8")); return alive(pid) ? pid : null; } catch { return null; } };

function start() {
  const pid = running();
  if (pid) { console.log(`already running (pid ${pid}); log: ${LOG}`); return; }
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  const out = fs.openSync(LOG, "a");
  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    cwd: ROOT, detached: true, stdio: ["ignore", out, out], env: process.env,
  });
  fs.writeFileSync(PID, String(child.pid));
  child.unref();
  console.log(`started (pid ${child.pid}); log: ${LOG}`);
}

async function stop() {
  const pid = running();
  if (!pid) { console.log("not running"); try { fs.unlinkSync(PID); } catch { /* none */ } return; }
  try { process.kill(-pid, "SIGTERM"); } catch { process.kill(pid, "SIGTERM"); }   // the whole group: CMS and its site
  for (let i = 0; i < 40 && alive(pid); i++) await new Promise((r) => setTimeout(r, 250));
  if (alive(pid)) { try { process.kill(-pid, "SIGKILL"); } catch { /* gone */ } }
  try { fs.unlinkSync(PID); } catch { /* none */ }
  console.log(`stopped (pid ${pid})`);
}

if (cmd === "start") start();
else if (cmd === "stop") await stop();
else if (cmd === "restart") { await stop(); start(); }
else { const pid = running(); console.log(pid ? `running (pid ${pid}); log: ${LOG}` : "not running"); }
