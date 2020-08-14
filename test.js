const vm = require('vm');

const sandbox = {
    animal: 'cat',
    count: 2,
    globalVar: 99
};
console.log(global)
// vm.createContext(sandbox)
console.log(global)

vm.runInNewContext('globalVar *= 2;count=console.log', sandbox);

console.log(sandbox)
