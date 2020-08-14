const { parentPort } = require('worker_threads');
const path = require('path');

parentPort.on('message', async (data) => {
    if (data) {
        const { cmd, workId, fileName, args } = data;
        if (cmd === 'start') {
            const fn = require(fileName);
            try {
                let result;
                switch (fn.constructor.name) {
                    case 'AsyncFunction':
                        result = await fn(...args);
                        break;
                    case 'Function':
                        result = fn(...args)
                }
                parentPort.postMessage({ event: 'done', result, workId });
            }
            catch (e) {
                parentPort.postMessage({ event: 'error', error: e, workId })
            }
        }

    }
})





