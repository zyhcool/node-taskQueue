const { parentPort, workerData } = require('worker_threads');
const path = require('path');

parentPort.on('message', (data) => {
    if (data.cmd === 'start') {
        let fn = require(path.resolve(__dirname, 'func.js'));
        try {
            let result = fn.call(null, ...data.args);
            parentPort.postMessage({ event: 'done', result, workId: data.workId });
        }
        catch (e) {
            parentPort.postMessage({ event: 'error', error: e, workId: data.workId })
        }
    }
})





