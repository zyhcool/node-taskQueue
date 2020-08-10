const http = require('http')
const queue = require('./index');


// 原始
http.createServer(async (req, res) => {
    let result = await queue.add({
        fn: (a, b) => {
            for (let i = 0; i < 7 * 10 ** 8; i++) { }
            return a + b;
        },
        context: null,
        args: [1, 2]
    })
    res.statusCode = 200;
    res.end(`${result}`);
}).listen(3000, () => {
    console.log('listen at 3000')
})



