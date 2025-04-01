# 背景

准备自研 serverless 平台 平台。这个代码仓库用于学习 & 验证 nodejs@22 中一些关键的技术。


# 需要验证的项

## Multi-process http server

nodejs@22 支持 cluster, 用于 创建多个 nodejs 实例。 我实现了一个[官方示例](/src/1_multi_process_http_server.js)，以下是实验结果。

```bash
> node src/1_multi_process_http_server.js
Primary 67689 is running
Worker 67690 started
Worker 67691 started
Worker 67693 started
Worker 67692 started
Worker 67695 started
Worker 67696 started
Worker 67694 started
Worker 67697 started
```

尝试访问

```bash
> curl http://localhost:8000
hello world from 67690
>curl http://localhost:8000
hello world from 67691
>curl http://localhost:8000
hello world from 67693
>curl http://localhost:8000
hello world from 67692
>curl http://localhost:8000
hello world from 67695
>curl http://localhost:8000
hello world from 67696
>curl http://localhost:8000
hello world from 67694
>curl http://localhost:8000
hello world from 67697
>curl http://localhost:8000
hello world from 67690
>curl http://localhost:8000
hello world from 67691
```

就像官方文档所述, 在 mac 上, 默认使用了轮循方法做负载均衡。


## Worker process keep alive

worker 进程保持存活是服务高可用的关键。我写了一些[示例](./src/2_worker_process_keep_alive/), 验证了以下情况:

- OOM: worker process oom 的时候会触发 退出事件, 并且 signal=SIGABRT

- `process.exit()`: worker process 主动调用 exit 时，会主进程会触发 disconnect 事件，然后触发 exit 事件

```bash
> node src/2_worker_process_keep_alive/exit_0.js
Primary 79699 is running
worker 79700 disconnect
worker 79704 disconnect
worker 79702 disconnect
worker 79700 died because of null, code: 0
worker 79702 died because of null, code: 0
worker 79704 died because of null, code: 0
worker 79703 disconnect
worker 79705 disconnect
worker 79703 died because of null, code: 0
worker 79705 died because of null, code: 0
worker 79701 disconnect
worker 79707 disconnect
worker 79706 disconnect
worker 79701 died because of null, code: 0
worker 79706 died because of null, code: 0
worker 79707 died because of null, code: 0

> node src/2_worker_process_keep_alive/exit_SIGABRT.js 
Primary 79757 is running
worker 79761 disconnect
worker 79763 disconnect
worker 79763 died because of null, code: 1
worker 79761 died because of null, code: 1
worker 79758 disconnect
worker 79762 disconnect
worker 79758 died because of null, code: 1
worker 79764 disconnect
worker 79762 died because of null, code: 1
worker 79764 died because of null, code: 1
worker 79765 disconnect
worker 79765 died because of null, code: 1
worker 79760 disconnect
worker 79760 died because of null, code: 1
worker 79759 disconnect
worker 79759 died because of null, code: 1
```

- throw error: worker process 抛错事实上是不触发 `worker.on('error')` 的, 从官方文档来看, 只有以下四件事发生，error 才会发生。

```
The 'error' event is emitted whenever:
无论何时， 'error' 事件都会发出：

The process could not be spawned.
进程无法启动。

The process could not be killed.
进程无法被杀死。

Sending a message to the child process failed.
向子进程发送信息失败。

The child process was aborted via the signal option.
子进程已通过 signal 选项中止。

The 'exit' event may or may not fire after an error has occurred. When listening to both the 'exit' and 'error' events, guard against accidentally invoking handler functions multiple times.
发生错误后， 'exit' 事件可能触发，也可能不触发。同时监听 'exit' 和 'error' 事件时，要防止意外多次调用处理程序函数。
```





# 总结

1. linux 与 mac 的 cluster fork 后对 listen 的负载处理默认采用的是轮训。

2. 大多数时候, primary process 无法感知到 worker 的 "错误"。更复杂的错误处理都需要在 worker process 里做。

3. worker process oom 后会 触发 exit 事件, 并且 signal=SIGABRT。

基于以上的验证结果, 目前的一个架构想法是:

![](./docs/arch.png)

# 关于 VM 部分

目前计划学习研究 https://github.com/labring/laf/tree/main/runtimes/nodejs 相关的设计和实现。选用适合我们的部分新实现一个更轻量的版本。

