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

var runState = {
  validators: [new BN('65c7237cd0c19c2a163dab6094db8aa98754cbd4', 16),
    new BN('e9dC86953CeC431e0E74c83EE8b2CB20F45dFA28', 16)],
  freegas: false
}

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

tape('test RAND opcode', function (test) {
  // Generate 1000 random numbers to see if there are duplicates
  var randList = []
  var testSum = 1000
  var isDuplicates = false
  var i
  for (i = 0; i < testSum; i++) {
    randList.push(opFns.RAND())
  }
  randList.sort(function (a, b) {
    return a.cmp(b)
  })
  for (i = 1; i < testSum; i++) {
    if (randList[i].cmp(randList[i - 1]) === 0) {
      isDuplicates = true
      break
    }
  }
  test.ok(!isDuplicates)
  test.end()
})

tape('test ISVALIDATOR opcode', function (test) {
  // only 65c7237 and e9dC869 are validators
  test.ok(opFns.ISVALIDATOR(new BN('65c7237cd0c19c2a163dab6094db8aa98754cbd4', 16), runState))
  test.ok(!opFns.ISVALIDATOR(new BN('561aD41faeb6A06Da9F80aDd2cb1129318Ef4eA6', 16), runState))
  test.end()
})

tape('test FREEGAS opcode', function (test) {
  opFns.FREEGAS(runState)
  test.ok(runState.freegas)
  test.end()
})

tape('test whether the contract can be executed normally', function (test) {
  var Buffer = require('safe-buffer').Buffer // use for Node.js <4.5.0
  var VM = require('../index.js')

  // create a new VM instance
  var vm = new VM()
  
  // bytecode of ./opFnsTest.sol
  var code = '608060405234801561001057600080fd5b506000806000600154f9016000819055503373ffffffffffffffffffffffffffffffffffffffff16f692506107d091506130398280156100775781817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff04101561007657fe5b5b02905050505060fd8061008b6000396000f3006080604052600436106049576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680634f8dd50d14604e57806386e321e414608c575b600080fd5b348015605957600080fd5b5060766004803603810190808035906020019092919050505060b4565b6040518082815260200191505060405180910390f35b348015609757600080fd5b50609e60c8565b6040518082815260200191505060405180910390f35b6000816001819055506001549050919050f8565b600080549050905600a165627a7a72305820fefacbb863d6617b7736b3c92a5195bb6460904f5728cdf39b18b9a207e1dee20029'
  
  vm.on('step', function (data) {
    console.log(data.opcode.name)
  })

  vm.runCode({
    code: Buffer.from(code, 'hex'),
    gasLimit: Buffer.from('ffffffff', 'hex')
  }, function (err, results) {
    console.log('gasUsed: ' + results.gasUsed.toString())
    test.pass(err == null)
  })
  test.end()
})
