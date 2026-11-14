// Entry point of a sampling worker thread (see sampling-pool.ts): answers every task with the chosen
// action.

import { parentPort } from "node:worker_threads";
import { runSamplingTask, type SamplingTask } from "./sampling-pool.js";

parentPort!.on("message", (task: SamplingTask) => {
  parentPort!.postMessage(runSamplingTask(task));
});
