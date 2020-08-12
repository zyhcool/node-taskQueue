const http = require('http')
const sum = require('./cpuConsume')

http.createServer(async (req, res) => {
    const result = await sum(1, 2);
    console.log(`res ${result}`)
    res.statusCode = 200;
    res.end(`${result}`);
}).listen(3000, () => {
    console.log('listen at 3000...')
})



