console.log(`Worker ${process.pid} started`);

Promise.resolve().then(() => {
  throw new Error("test");
});
