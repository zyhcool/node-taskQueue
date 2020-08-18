const { parentPort, workerData } = require('worker_threads');
const path = require('path');

const IDLETIME = 10 * 60 * 1000;
// const IDLETIME = 10 * 1000;
let lastActiveTime = Date.now();

parentPort.on('message', async (data) => {
    if (data) {
        const { cmd, workId, fileName, args } = data;
        if (cmd === 'start') {
            lastActiveTime = Date.now();
            const fn = require(fileName);
            try {
                let result = await fn(...args);
                parentPort.postMessage({ event: 'done', result, workId });
            }
            catch (e) {
                parentPort.postMessage({ event: 'error', error: e, workId })
            }
        }

    }
})

function checkoutActive() {
    if (Date.now() - lastActiveTime > IDLETIME) {
        process.exit(0)
    }
}

setInterval(() => {
    checkoutActive()
}, 1000);


