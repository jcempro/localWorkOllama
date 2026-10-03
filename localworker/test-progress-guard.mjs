import assert from "node:assert/strict";
import { ProgressGuardP6R, failureClassP6R } from "./progress-guard.mjs";
const guard = new ProgressGuardP6R(), args = { id: "validate" };
guard.record("run_authorized_command", args, "a", "a", "exit 1", Error("assertion failed"));
assert.match(guard.before("run_authorized_command", args, "a"), /bloqueada/);
assert.equal(guard.before("run_authorized_command", args, "b"), null);
assert.equal(guard.before("run_authorized_command", { id: "corrected" }, "a"), null);
assert.equal(guard.before("read_file", { path: "source.py" }, "a"), null);
assert.equal(guard.record("read_file", { path: "source.py" }, "a", "a", "new source").progress, true);
// Alterar superficialmente o erro ou a ferramenta não transforma falha em progresso.
let result;
for(let n=0;n<4;n++) result=guard.record("run_command", {args:[String(n)]}, "a", "a", `error ${n}`, Error(`assertion failed at line ${n}`));
assert.equal(result.stop,true);
assert.equal(result.sequence.at(-1).kind,"deterministic");
const transient = new ProgressGuardP6R();
for(let n=0;n<3;n++) {
  assert.equal(transient.before("read_file", args, "a"),null);
  transient.record("read_file",args,"a","a","timeout",Error("ETIMEDOUT"));
}
assert.match(transient.before("read_file",args,"a"),/bloqueada/);
const normal=new ProgressGuardP6R();
for(let n=0;n<12;n++) assert.equal(normal.record("read_file",{path:String(n)},"a","a",`evidence ${n}`).stop,false);
for(const [text,kind] of [["EACCES","permission"],["ENOENT","precondition"],["inválido","invalid_or_disallowed"],["unsupported","incompatible_tool"],["EBUSY","external_block"],["ENOMEM","infrastructure"]]) assert.equal(failureClassP6R(Error(text)),kind);
console.log("progress guard: deterministic, changed state/strategy, transient, alternatives and normal progress OK");
