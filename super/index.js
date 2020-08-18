const { Worker } = require('worker_threads');
const path = require('path');
const { EventEmitter } = require('events');

const log = console.log;

let id = 0;

// 将cWorkPool放到公共内存
let cWorkerPool = {};

class CustomWorker extends EventEmitter {
    constructor(task) {
        super();
        this.init(task);
    }

    init(task) {
        this.check(task);
        this.workId = id++;
        this.args = task.args;
        this.fileName = task.fileName;
    }
    check(task) {
        if (!task) {
            console.error('task can\'t be empty');
        }
        const { args, fileName } = task;
        if (args && args.constructor.name !== 'Array') {
            task.args = [args];
        }
        if (!fileName || typeof fileName !== "string") {
            throw new Error('fileName require string type data');
        }
    }
}


class TaskQueue {
    constructor(options = {}) {
        // 单例模式
        if (this.constructor.instance) {
            return this.constructor.instance;
        } else {
            this.constructor.instance = this;
        }
        this.init(options);
    }

    get length() {
        return this.queue.length;
    }

    init(options) {
        // 队列缓存最大任务数
        this.maxLength = options.maxLength || 10000;
        // 任务队列
        this.queue = [];
        // 当前状态 IDLE：等待任务；POLLING：正在消耗队列
        this.status = 'IDLE';
        // 维护threadPool线程池
        this.threadPool = new ThreadPool({ max: 50, selectMethod: "ORDER", threadMax: 100 });

        this.poll();
    }

    add(task) {
        if (this.queue.length >= this.maxLength) {
            throw new Error('max task exceed');
        }
        const cWorker = new CustomWorker(task);
        cWorkerPool[cWorker.workId] = cWorker;
        let promise = new Promise((resolve, reject) => {
            cWorker.once('error', (error) => {
                reject(error);
            });
            cWorker.once('success', (data) => {
                resolve(data);
            })
        })

        this.queue.push(cWorker);
        if (this.status === 'IDLE') {
            this.poll();
        }
        return promise;
    }

    poll() {
        return setTimeout(() => {
            if (this.length > 0) {
                this.status = 'POLLING';
                const cWorker = this.queue.shift();
                const { args, workId, fileName } = cWorker;
                // 选择空闲线程，若没有则重新poll
                const thread = this.threadPool.selectThread()
                if (thread) {
                    thread.worker.postMessage({ cmd: 'start', workId, fileName, args })
                    thread.tasks++;
                    this.threadPool.totalWork++;
                } else {
                    this.queue.unshift(cWorker);
                }
                return this.poll();
            } else {
                this.status = 'IDLE';
            }
        }, 0);
    }
}

/**
 * 线程池ThreadPool类
 */
class ThreadPool {
    constructor(options = {}) {
        // 线程池使用数组保存
        this.pool = [];
        // 最大线程数
        this.max = options.max || 30;
        // 单个线程的最大任务数
        this.threadMax = options.threadMax || 100;
        // 分配线程的策略
        this.selectMethod = options.selectMethod || 'ORDER'
        // 当前线程池总任务数
        this.totalWork = 0;
        // 最近被选择的线程的索引，按顺序时使用该属性
        this.lastSelect = 0;

        this.init(options);
    }

    // 开启多个线程，使用pool属性维护这些线程
    init() {
        let max = this.max;
        while (max--) {
            this.createThread();
        }
    }

    createThread() {
        const worker = new Worker(path.resolve(__dirname, 'work.js'));
        const thread = {
            worker,
            tasks: 0,
        };
        worker.on('message', (data) => {
            const cWorker = cWorkerPool[data.workId];
            switch (data.event) {
                case 'done':
                    cWorker.emit('success', data.result);
                    break;
                case 'error':
                    cWorker.emit('error', data.error);
                    break;
                default:
                    break;
            };
            delete cWorkerPool[data.workId];
            thread.tasks--;
            this.totalWork--;
        });
        worker.on('error', (error) => {
            console.error(error);
        });
        worker.on('exit', (exitcode) => {
            log(`${worker.threadId} exit: ${exitcode}`);
            // 线程异常退出则马上充新的线程
            if (exitcode !== 0) {
                this.createThread();
            }
            this.pool.splice(this.pool.findIndex(thread => {
                return thread.worker.threadId === worker.threadId;
            }), 1);

        })
        this.pool.push(thread);
        return thread;
    }

    // 按顺序选择线程
    selectThread() {
        // 每个线程最大任务数已满且有空余线程空间时，新建线程
        if (this.totalWork >= this.pool.length * this.threadMax && this.pool.length < this.max) {
            return this.createThread();
        }
        let index;
        switch (this.selectMethod) {
            case 'ORDER':
                if (this.lastSelect >= this.pool.length) {
                    this.lastSelect = 0;
                }
                index = this.pool[this.lastSelect].tasks < this.threadMax && this.lastSelect++;
                break;
            case 'FREE':
                let min = 0;
                this.pool.forEach((thread, i) => {
                    if (min < thread.tasks && thread.tasks < this.threadMax) {
                        min = thread.tasks;
                        index = i;
                    }
                })
                break;
            default:
                break;
        }
        const thread = this.pool[index];
        if (!thread || thread.tasks >= this.threadMax) {
            log('reselect thread')
            return this.selectThread();
        }
        return thread;
    }
}

module.exports = new TaskQueue();