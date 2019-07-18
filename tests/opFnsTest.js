const tape = require('tape')
const opFns = require('../lib/opFns.js')
const utils = require('ethereumjs-util')
const BN = utils.BN
const exceptions = require('../lib/exceptions.js')
const ERROR = exceptions.ERROR
const VmError = exceptions.VmError

const TWO_POW255 = utils.TWO_POW256.div(new BN('10', 2))     // 2^255
const U256UpperBound = utils.TWO_POW256.sub(new BN('1', 2))  // 2^256-1
const S256UpperBound = TWO_POW255.sub(new BN('1', 2))        // 2^255-1
const S256LowerBound = TWO_POW255                            // -2^255

tape('test the integer arithmetic opcodes', function (test) {
  var a = new BN('10', 2) // 2
  var b = new BN('01', 2) // 1
  var c = new BN(U256UpperBound, 2) // -1
  var overflowError = new VmError(ERROR.OVERFLOW_ERROR)

  // UADD testing
  test.ok(opFns.UADD(b, b, null).cmp(a) === 0) // 1+1=2
  test.throws(function () { opFns.UADD(utils.TWO_POW256, b, null) }, overflowError)

  // SADD testing
  test.ok(opFns.SADD(b, b, null).cmp(a) === 0) // 1+1=2
  test.ok(opFns.SADD(a, c, null).cmp(b) === 0) // 2+(-1)=1
  test.throws(function () { opFns.SADD(S256UpperBound, b, null) }, overflowError)
  test.throws(function () { opFns.SADD(S256LowerBound, c, null) }, overflowError)

  // USUB testing
  test.ok(opFns.USUB(a, b, null).cmp(b) === 0) // 2-1=1
  test.throws(function () { opFns.USUB(b, a, null) }, overflowError)

  // SSUB testing
  test.ok(opFns.SSUB(a, b, null).cmp(b) === 0) // 2-1=1
  test.ok(opFns.SSUB(b, c, null).cmp(a) === 0) // 1-(-1)=2
  test.throws(function () { opFns.SSUB(S256UpperBound, c, null) }, overflowError)
  test.throws(function () { opFns.SSUB(S256LowerBound, b, null) }, overflowError)

  // UMUL testing
  test.ok(opFns.UMUL(a, b, null).cmp(a) === 0) // 2*1=2
  test.throws(function () { opFns.UADD(utils.TWO_POW256, b, null) }, overflowError)

  // SMUL testing
  test.ok(opFns.SMUL(a, b, null).cmp(a) === 0) // 2*1=2
  test.ok(opFns.SMUL(b, c, null).cmp(c) === 0) // 1*(-1)=-1
  test.throws(function () { opFns.SMUL(S256UpperBound, a, null) }, overflowError)
  test.throws(function () { opFns.SMUL(S256LowerBound, c, null) }, overflowError)

  test.end()
})

tape('test the fixed-point arithmetic opcodes', function (test) {
  var a = new BN('10', 2) // 2
  var b = new BN('01', 2) // 1
  var c = new BN(U256UpperBound, 2) // -1
  var zero = new BN('0', 2) // 0
  var overflowError = new VmError(ERROR.OVERFLOW_ERROR)

  // UFMUL testing
  test.ok(opFns.UFMUL(a, b, b, null).cmp(zero) === 0) // x=2,y=1,N=1 0
  test.ok(opFns.UFMUL(U256UpperBound, b, zero, null).cmp(U256UpperBound) === 0)
  test.throws(function () { opFns.UFMUL(U256UpperBound, a, zero, null) }, overflowError)

  // SFMUL testing
  test.ok(opFns.SFMUL(a, c, b, null).cmp(zero) === 0) // x=2,y=-1,N=1 0
  test.throws(function () { opFns.SFMUL(S256LowerBound, c, zero, null) }, overflowError)
  test.throws(function () { opFns.SFMUL(S256UpperBound, a, zero, null) }, overflowError)

  // UFDIV testing
  test.ok(opFns.UFDIV(b, a, b, null).cmp(new BN('0101', 2)) === 0) // x=1,y=2,N=1 5
  test.ok(opFns.UFDIV(U256UpperBound, b, zero, null).cmp(U256UpperBound) === 0)
  test.throws(function () { opFns.UFDIV(U256UpperBound, a, a, null) }, overflowError)

  // SFDIV testing
  test.ok(opFns.SFDIV(c, b, zero, null).cmp(c) === 0) // x=-1,y=1,N=0 -1
  test.throws(function () { opFns.SFDIV(S256LowerBound, c, zero, null) }, overflowError)
  test.throws(function () { opFns.SFDIV(S256UpperBound, c, a, null) }, overflowError)

  test.end()
})
