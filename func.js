module.exports = function sum(a, b) {
    console.time('sum')
    for (let i = 0; i < 10 ** 9; i++) { };
    console.timeEnd('sum')
    return a + b;
}