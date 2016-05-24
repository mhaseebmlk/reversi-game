'use strict'

console.log('hello')
const ONE = 1
function* foo() {
    const x = ONE + (yield 'foo')
    console.log(x)
}

function* foo2() {
    yield ONE
    yield ONE + ONE
    yield ONE + ONE + ONE
    yield ONE + ONE + ONE + ONE
    yield ONE + ONE + ONE + ONE + ONE
    return ONE + ONE + ONE + ONE + ONE + ONE
}

// const it = foo2()
// let msg = it.next()
// console.log(msg)
for (const v of foo2()) {
    console.log(v)
}
console.log(foo2().next())
