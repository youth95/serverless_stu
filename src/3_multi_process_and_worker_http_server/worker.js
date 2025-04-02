export default function (task) {
  // 故意 oom
  const arr = [];
  while (true) {
    arr.push(new Array(10000000).fill("x"));
  }

  return task;
}

process.on("message", (message) => {
  // 故意 oom
  const arr = [];
  while (true) {
    arr.push(new Array(10000000).fill("x"));
  }
});
