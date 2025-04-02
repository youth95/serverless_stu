import cluster from "node:cluster";
import http from "node:http";
import { availableParallelism } from "node:os";
import process from "node:process";
import genericPool from "generic-pool";
import { fork } from "node:child_process";
const numCPUs = availableParallelism();

if (cluster.isPrimary) {
  // Server Primary Process
  cluster.setupPrimary({
    // silent: true,
  });

  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();

    worker.on("error", (error) => {
      console.log(`Service Process ${worker.process.pid} error`, error);
    });

    worker.on("disconnect", () => {
      console.log(`Service Process ${worker.process.pid} disconnect`);
    });
  }

  cluster.on("exit", (worker, code, signal) => {
    // SIGABRT

    console.log(
      `Service Process ${worker.process.pid} died because of ${signal}, code: ${code}`
    );

    // 如果 worker 非正常退出，则重启一个 worker
    if (signal !== null) {
      const newWorker = cluster.fork();
      console.log(`Service Process ${newWorker.process.pid} rebooted`);
    }
  });
} else {
  // Service Process

  // 初始化线程池

  // const pool = new Piscina({
  //   minThreads: numCPUs,
  //   maxThreads: numCPUs * 2,
  //   filename: new URL("./worker.js", import.meta.url).href,
  //   resourceLimits: {
  //     maxOldGenerationSizeMb: 1024,
  //     maxYoungGenerationSizeMb: 1024,
  //     codeRangeSizeMb: 1024,
  //     stackSizeMb: 1024,
  //   },
  // });

  /**
   * Step 1 - Create pool using a factory object
   */
  const factory = {
    create: () =>
      fork(
        "/Users/bilibili/projects/b/serverless_stu/src/3_multi_process_and_worker_http_server/worker.js"
      ),
    destroy: (proc) => proc.kill(),
  };

  const opts = {
    max: 10, // maximum size of the pool
    min: 2, // minimum size of the pool
  };

  const myPool = genericPool.createPool(factory, opts);

  http
    .createServer(async (req, res) => {
      /**@type {import('node:child_process').ChildProcess} */
      const worker = await myPool.acquire();

      worker.send({
        body: req.body,
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      worker.on("message", (result) => {
        res.writeHead(200);
        res.end(
          `${JSON.stringify(result)} from ${process.pid} ${JSON.stringify(
            pool.runTime
          )} ${JSON.stringify(pool.waitTime)}\n`
        );
      });

      worker.on("exit", (code, signal) => {
        // 这里有机会做恢复
        if (signal === "SIGABRT") {
          res.writeHead(200);
          res.end(`云函数执行进程异常, 这里可以做恢复, 但是我没时间, 先不做`);
        } else {
          res.writeHead(200);
          res.end(`worker exit ${code} ${signal}`);
        }
      });
    })
    .listen(8000);

  console.log(`Service Process ${process.pid} started`);
}
