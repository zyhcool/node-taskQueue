const { Worker } = require('worker_threads');
const path = require('path');
const { EventEmitter } = require('events');

const log = console.log;

let id = 0;

class CustomWorker extends EventEmitter {
    constructor(task) {
        super();
        this.init(task);
    }

    init(task) {
        this.check(task);
        this.workId = id++;
        this.args = task.args;
    }
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

        // this.complete = true;

        const worker = new Worker(path.resolve(__dirname, 'work.js'))
        worker.on('message', (data) => {
            const cWorker = this.cWorkerPool[data.workId]
            if (data.event === 'done') {
                // this.complete = true;
                cWorker.emit('success', data.result);
            }
            else if (data.event === 'error') {
                cWorker.emit('error', data.error);
            }
            delete this.cWorkerPool[data.workId];
        })
        this.worker = worker;

        this.poll();
    }


    add(task) {
        if (this.queue.length >= this.maxLength) {
            console.error('max task exceed')
            return;
        }
        const cWorker = new CustomWorker(task);
        this.queue.push(cWorker);
        this.cWorkerPool[cWorker.workId] = cWorker;
        if (this.status !== 'POLLING') {
            this.poll();
        }
        return new Promise((resolve, reject) => {
            cWorker.once('error', (error) => {
                reject(error);
            });
            cWorker.once('success', (data) => {
                resolve(data);
            })
        })
    }

    async poll() {
        this.status = 'POLLING';
        if (this.queue.length > 0) {
            const cWorker = this.queue.shift();
            const { args, workId } = cWorker;

            console.log('jj')
            // this.complete = false;
            this.worker.postMessage({ cmd: 'start', workId, args })


            this.poll();
        } else {
            this.status = 'IDLE';
        }
    }


}


module.exports = new TaskQueue();


