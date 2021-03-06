const { Worker } = require('worker_threads');
const path = require('path');
const { EventEmitter } = require('events');

const log = console.log;

let id = 0;

/**
 * CustomWorker作为主线程和子线程的中间通信层，交换数据
 */
class CustomWorker extends EventEmitter {
    constructor(task) {
        super();
        this.init(task);
    }

    // 初始化
    init(task) {
        this.check(task);
        this.workId = id++;
        this.args = task.args;
    }

    // 检查参数格式
    check(task) {
        if (!task) {
            console.error('task can\'t be empty');
        }
        const { args } = task;
        if (args && args.constructor.name !== 'Array') {
            task.args = [args];
        }
    }
}

/**
 * 任务队列
 */
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
        // 队列池，存放事件回调
        this.cWorkerPool = {};
        // 当前状态 IDLE：等待任务；POLLING：正在消耗队列
        this.status = 'IDLE';

        const worker = new Worker(path.resolve(__dirname, 'work.js'))
        worker.on('message', (data) => {
            const cWorker = this.cWorkerPool[data.workId]
            if (data.event === 'done') {
                cWorker.emit('success', data.result);
            }
            else if (data.event === 'error') {
                cWorker.emit('error', data.error);
            }
            // 完成数据传递后，释放该cWorker在cWorkerPool中占用的空间
            delete this.cWorkerPool[data.workId];
        })
        // 将子线程引用到worker属性
        this.worker = worker;

        this.poll();
    }


    add(task) {
        if (this.queue.length >= this.maxLength) {
            console.error('max task exceed')
            return;
        }
        const cWorker = new CustomWorker(task);
        this.cWorkerPool[cWorker.workId] = cWorker;
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

    /**
     * 状态为POLLING时，轮询队列；状态为IDLE时，停止poll执行
     */
    poll() {
        this.status = 'POLLING';
        if (this.queue.length > 0) {
            const cWorker = this.queue.shift();
            const { args, workId } = cWorker;
            this.worker.postMessage({ cmd: 'start', workId, args })
            return this.poll();
        } else {
            this.status = 'IDLE';
        }
    }


}


module.exports = new TaskQueue();


