class Singleton {
    constructor(name) {
        if (this.constructor.instance) {
            return this.constructor.instance;
        } else {
            this.constructor.instance = this;
        }
        this.name = name;
    }
}

let a = new Singleton('zyh');
let b = new Singleton('bbb');
console.log(a, b)