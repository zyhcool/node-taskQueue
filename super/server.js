const http = require('http')
const queue = require('./index');
const path = require('path')

const port = 4004;
// 原始
http
    .createServer(async (req, res) => {
        const result = await queue.add({
            args: [1, 2],
            fileName: path.resolve(__dirname, './../cpuConsume.js'),
        })
        console.log(`res ${result}`)
        res.statusCode = 200;
        res.end(`${result}`);
    })
    .listen(port, () => {
        console.log(`listen at ${port}`)
    })
    .on('error', (err) => {
        console.error(err.message)
    })



