
var rskapi = require('rskapi');
var sargs = require('simpleargs');
var async = require('simpleasync');

var contracts = require('./lib/contracts');
var commands = require('./lib/commands');
var utils = require('./lib/utils');

var config = require('./config.json');

var contract = contracts.compile('counter.sol:counter', 'counter.sol');

sargs
    .define('h', 'host', config.host, 'Host JSON RPC entry point')
    .define('f', 'from', config.account, 'Initial account')
    .define('c', 'count', 10, 'Transactions to send');

var argv = sargs(process.argv.slice(2));

var host = rskapi.host(argv.host);

function invokeCounter(cb) {
    async().exec(function (next) {
        commands.unlockAccount(host, argv.from, next);
    })
    .then(function (data, next) {
        commands.callTransaction(host, argv.from, contract.address, 0, { data: contracts.encodeCall(contract, 'getValue()', []) }, next);
    })
    .then(function (data, next) {
        console.log('value', utils.decodeValue(data));
        commands.processTransaction(host, argv.from, contract.address, 0, { gas: 2000000, data: contracts.encodeCall(contract, 'add(uint256)', [ 10 ]) }, cb);
    })
}

async()
    .exec(function (next) {
        commands.unlockAccount(host, argv.from, next);
    })
    .then(function (data, next) {
        commands.createContract(host, argv.from, 0, contract.bytecode, next);
    })
    .then(function (data, next) {
        contract.address = data;
        console.log('new contract', contract.address);
        commands.callTransaction(host, argv.from, contract.address, 0, { data: contracts.encodeCall(contract, 'getValue()', []) }, next);
    })
    .then(function (data, next) {
        utils.repeat(invokeCounter, argv.count, next);
    })
    .then(function (data, next) {
        commands.callTransaction(host, argv.from, contract.address, 0, { data: contracts.encodeCall(contract, 'getValue()', []) }, next);
    })
    .then(function (data, next) {
        console.log('value', utils.decodeValue(data));
    })
    .error(function (err) {
        console.log(err);
    });

