import cluster from "node:cluster";
import http from "node:http";
import { availableParallelism } from "node:os";
import process from "node:process";
import Piscina from "piscina";

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
  const pool = new Piscina({
    minThreads: numCPUs,
    maxThreads: numCPUs * 2,
    filename: new URL("./worker.js", import.meta.url).href,
    resourceLimits: {
      maxOldGenerationSizeMb: 1024,
      maxYoungGenerationSizeMb: 1024,
      codeRangeSizeMb: 1024,
      stackSizeMb: 1024,
    },
  });

  http
    .createServer(async (req, res) => {
      const result = await pool.run({
        body: req.body,
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      res.writeHead(200);
      res.end(
        `${JSON.stringify(result)} from ${process.pid} ${JSON.stringify(
          pool.runTime
        )} ${JSON.stringify(pool.waitTime)}\n`
      );
    })
    .listen(8000);

  console.log(`Service Process ${process.pid} started`);
}
