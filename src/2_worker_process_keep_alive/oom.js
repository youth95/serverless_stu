console.log(`Worker ${process.pid} started`);

// 故意 oom
const arr = [];
while (true) {
  arr.push(new Array(10000000).fill("x"));
}
