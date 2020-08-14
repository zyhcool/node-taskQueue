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
        this.init(options);
    }

    get length() {
        return this.queue.length;
    }

    init(options) {
        // 最大任务数
        this.maxLength = options.maxLength || 100;
        // 任务队列
        this.queue = [];
        // 当前状态 IDLE：等待任务；POLLING：正在消耗队列
        this.status = 'IDLE';
        // 维护threadPool线程池
        this.threadPool = new ThreadPool({ max: 50 });

        this.poll();
    }

    add(task) {
        if (this.queue.length >= this.maxLength) {
            console.error('max task exceed')
            return;
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
        this.status = 'POLLING';
        if (this.queue.length > 0) {
            const cWorker = this.queue.shift();
            const { args, workId } = cWorker;
            const worker = this.threadPool.selectThread()
            worker.postMessage({ cmd: 'start', workId, fileName, args })
            return this.poll();
        } else {
            this.status = 'IDLE';
        }
    }
}

/**
 * 线程池ThreadPool类
 */
class ThreadPool {
    constructor(options = {}) {
        this.pool = [];
        this.max = options.max || 30;
        this.lastSelect = 0;
        this.init(options);
    }

    // 开启多个线程，使用pool属性维护这些线程
    init() {
        let max = this.max;
        while (max--) {
            const worker = new Worker(path.resolve(__dirname, 'work.js'));
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

            });
            worker.on('error', (error) => {
                console.error(error);
            });
            worker.on('exit', (exitcode) => {
                log(`${worker.threadId} exit: ${exitcode}`);
            })
            this.pool.push(worker)
        }
    }

    // 按顺序选择线程
    selectThread() {
        if (this.lastSelect >= this.pool.length) {
            this.lastSelect = 0;
        }
        return this.pool[this.lastSelect++];
    }
}

module.exports = new TaskQueue();