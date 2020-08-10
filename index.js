const { Worker } = require('worker_threads');
const path = require('path')

const log = console.log;


class Task {
    constructor(task) {
        this.init(task);
    }

    init(task) {
        this.check(task);
        this.fn = task.fn;
        this.context = task.context;
        this.args = task.args;
        this.callback = null;
    }

    check(task) {
        if (!task) {
            console.error('task can\'t be empty');
        }
        const { fn, context, args } = task;
        if (!fn) {
            console.error('fn must be provided');
        }
        if (['AsyncFunction', 'Function'].indexOf(fn.constructor.name) < 0) {
            console.error('fn must be function');
        }
        if (context && typeof context !== 'object') {
            console.error('context must be object')
        }
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
        this.poll();
    }


    add(task) {
        log('add', this.length);
        if (this.queue.length >= this.maxLength) {
            console.error('max task exceed')
            return;
        }
        task = new Task(task);
        return new Promise((resolve, reject) => {
            task.callback = (error, data) => {
                if (error) {
                    reject(error);
                    return;
                };
                resolve(data);
            }
            this.queue.push(task);
            if (this.status !== 'POLLING') {
                this.poll();
            }
        })
    }

    poll() {
        this.status = 'POLLING';
        if (this.queue.length > 0) {
            const task = this.queue.shift();
            const { fn, context, args, callback } = task;

            this.worker.once('message', (data) => {
                if (data.event === 'done') {
                    callback(null, data.result);
                }
                else if (data.event === 'error') {
                    callback(data.error, null);
                }
            })
            this.worker.postMessage({ cmd: 'start', args })
            log('result', this.length);

            this.poll();
        } else {
            this.status = 'IDLING';
            log(this.worker.listenerCount('message'))
            // setTimeout(() => {
            //     log(id++, 'idling...')
            //     this.poll();
            // }, this.idleTime);
        }
    }


}

let queue = new MyQueue();
module.exports = queue;











