import cluster from "node:cluster";
import { availableParallelism } from "node:os";
import process from "node:process";
import worker from  "worker_threads";


const numCPUs = availableParallelism();

cluster.setupPrimary({
  exec: process.argv[2],
  silent: true,
});
console.log(`Primary ${process.pid} is running`);

// Fork workers.
for (let i = 0; i < numCPUs; i++) {
  const worker = cluster.fork();

  worker.on("error", (error) => {
    console.log(`worker ${worker.process.pid} error`, error);
  });

  worker.on("disconnect", () => {
    console.log(`worker ${worker.process.pid} disconnect`);
  });
}

cluster.on("exit", (worker, code, signal) => {
  // SIGABRT

  console.log(
    `worker ${worker.process.pid} died because of ${signal}, code: ${code}`
  );

  // 如果 worker 非正常退出，则重启一个 worker
  if (signal !== null) {
    const newWorker = cluster.fork();
    console.log(`worker ${newWorker.process.pid} rebooted`);
  }
});
