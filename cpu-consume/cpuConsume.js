
/**
 * 模拟cpu耗时操作
 * @param {number} time 单位：秒
 */
function sleep(time) {
    return new Promise((resolve, reject) => {
        const start = Date.now()
        while (true) {
            if (Date.now() - start >= time * 1000) {
                resolve();
                break;
            }
        }
    })
}

module.exports = async function sum(a, b) {
    await sleep(2);
    return a + b;
}
