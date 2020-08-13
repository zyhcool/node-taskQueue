const http = require('http')
const sum = require('./../cpuConsume')
const log = console.log;

const port = 4000;

http.createServer(async (req, res) => {
    const result = await sum(1, 2);
    log(`res ${result}`)
    res.statusCode = 200;
    res.end(`${result}`);
}).listen(port, () => {
    log(`listen at ${port}...`)
})


