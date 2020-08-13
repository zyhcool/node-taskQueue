const http = require('http')
const os = require("os")
const cluster = require("cluster");
const queue = require('./index');
const log = console.log;

const port = 4003;

const cpuNum = os.cpus().length;
log(`cpu num: ${cpuNum}`)

if (cluster.isMaster) {
    log(`Master ${process.pid} is running`);

    for (let i = 0; i < cpuNum; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        log(`worker ${worker.process.pid} died`);
    });
} else {
    http.createServer(async (req, res) => {
        const result = await queue.add({
            args: [1, 2]
        })
        log(`res ${result}`)
        res.statusCode = 200;
        res.end(`${result}`);
    }).listen(port, () => {
        log(`listen at ${port}`)
    })

    log(`Worker ${process.pid} started`);
}




