const { parentPort } = require('worker_threads');


parentPort.on('message', (data) => {
    const start = Date.now()
    while (true) {
        if (Date.now() - start >= 0.2 * 1000) {
            break;
        }
    }

    console.log(Date.now())
})

