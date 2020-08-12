const { parentPort } = require('worker_threads');
const path = require('path');

parentPort.on('message', async (data) => {
    if (data.cmd === 'start') {
        const fn = require(path.resolve(__dirname, 'cpuConsume.js'));
        try {
            const result = await fn.call(null, ...data.args);
            parentPort.postMessage({ event: 'done', result, workId: data.workId });
        }
        catch (e) {
            parentPort.postMessage({ event: 'error', error: e, workId: data.workId })
        }
    }
})





