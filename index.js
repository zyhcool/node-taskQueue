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


class MyQueue {
    constructor(options = {}) {
        // 最大任务数
        this.maxLength = options.maxLength || 30;
        // 队列空闲时间
        this.idleTime = options.idleTime || 1000;
        // 队列名称
        this.name = options.name || 'default'
        // 任务队列
        this.queue = [];
        // 队列池，事件回调
        this.workPool = {};
        // 当前状态 IDLING：等待任务；POLLING：正在消耗队列
        this.status = 'IDLING'
        this.init();
    }

    get length() {
        return this.queue.length;
    }

    init() {
        let worker = new Worker(path.resolve(__dirname, 'work.js'))
        this.worker = worker;
        this.worker.on('message', (data) => {
            const work = this.workPool[data.workId]
            if (data.event === 'done') {
                work.emit('success', data.result);
            }
            else if (data.event === 'error') {
                work.emit('error', data.error);
            }
            delete this.workPool[data.workId];
        })

        this.poll();
    }


    add(task) {
        if (this.queue.length >= this.maxLength) {
            console.error('max task exceed')
            return;
        }
        const work = new CustomWorker(task);
        this.queue.push(work);
        this.workPool[work.workId] = work;
        if (this.status !== 'POLLING') {
            this.poll();
        }
        return new Promise((resolve, reject) => {
            work.once('error', (error) => {
                reject(error);
            });
            work.once('success', (data) => {
                resolve(data);
            })
        })
    }

    async poll() {
        log('current queue length:', this.length, '\n', 'pool size:', Object.keys(this.workPool).length)
        this.status = 'POLLING';
        if (this.queue.length > 0) {
            const work = this.queue.shift();
            const { args, workId } = work;

            this.worker.postMessage({ cmd: 'start', workId, args })

            this.poll();
        } else {
            this.status = 'IDLING';
        }
    }


}


module.exports = new MyQueue();


