const http = require('http')
const path = require('path')
const { Worker } = require('worker_threads');

const worker = new Worker(path.resolve(__dirname, 'work.js'));
const port = 3000;
let id = 0;

http.createServer(async (req, res) => {
    worker.postMessage(id++);
    res.statusCode = 200;
    res.end(`${id}`);
}).listen(port, () => {
    console.log(`listen at ${port}`)
})



