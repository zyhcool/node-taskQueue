
/**
 * 模拟cpu耗时操作
 * @param {number} time 单位：秒
 */
function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time * 1000);
    })
}

module.exports = async function sum(a, b) {
    console.time('sum')
    await sleep(2);
    console.timeEnd('sum')
    return a + b;
}
