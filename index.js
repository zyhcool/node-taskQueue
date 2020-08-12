const { Worker } = require('worker_threads');
const path = require('path');
const { EventEmitter } = require('events');

const log = console.log;

let id = 0;
let workerPool = {};

class Task {
    constructor(task) {
        this.init(task);
    }

    init(task) {
        this.check(task);
        this.args = task.args;
        this.workId = null;
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

class MyWork extends EventEmitter {
    constructor() {
        super();
        this.workId = id++;
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
        this.queue = [];
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
            const work = workerPool[data.workId]
            if (data.event === 'done') {
                work.emit('success', data.result);
            }
            else if (data.event === 'error') {
                work.emit('error', data.error);
            }
            delete workerPool[data.workId];
        })

        this.poll();
    }


    add(task) {
        if (this.queue.length >= this.maxLength) {
            console.error('max task exceed')
            return;
        }
        const work = new MyWork();
        task = new Task(task);
        task.workId = work.workId;
        this.queue.push(task);
        workerPool[work.workId] = work;
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
        this.status = 'POLLING';
        if (this.queue.length > 0) {
            const task = this.queue.shift();
            const { args, workId } = task;
            this.worker.postMessage({ cmd: 'start', workId, args })

            this.poll();
        } else {
            this.status = 'IDLING';
        }
    }


}


module.exports = new MyQueue();


