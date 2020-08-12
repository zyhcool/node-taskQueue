const http = require('http')
const queue = require('./index');


// 原始
http.createServer(async (req, res) => {
    let result = await queue.add({
        args: [1, 2]
    })
    console.log(`res ${result}`)
    res.statusCode = 200;
    res.end(`${result}`);
}).listen(3000, () => {
    console.log('listen at 3000')
})



