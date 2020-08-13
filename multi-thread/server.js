const http = require('http')
const queue = require('./index');

const port = 4002;
// 原始
http.createServer(async (req, res) => {
    const result = await queue.add({
        args: [1, 2]
    })
    console.log(`res ${result}`)
    res.statusCode = 200;
    res.end(`${result}`);
}).listen(port, () => {
    console.log(`listen at ${port}`)
})



