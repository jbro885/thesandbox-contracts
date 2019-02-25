const Web3 = require('web3');

const assert = require('assert');
const rocketh = require('rocketh');

const web3 = new Web3();
web3.setProvider(ethereum);

// const truffleConfig = require('../../truffle-config.js');

const gas = 4000000;
const deployGas = 6000000;

function getEventsFromReceipt(contract, sig, receipt) {
  return contract.getPastEvents(sig, {
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber
  });
}

function getPastEvents(contract, sig) {
  return contract.getPastEvents(sig, {
    fromBlock: 0
  });
}

module.exports = {

  web3,

  deployContract: (from, contractName, ...args) => {
    const ContractInfo = rocketh.contractInfo(contractName);
    const Contract = new web3.eth.Contract(ContractInfo.abi, {data: '0x' + ContractInfo.evm.bytecode.object});
    return Contract.deploy({arguments: args}).send({from, gas: deployGas});
  },

  revertToSnapshot: (id) => {
    return new Promise((resolve, reject) => {
      // console.log('reverting to snapshot ' + id + '...');
      web3.currentProvider.sendAsync({
        method: 'evm_revert',
        params: [id],
        jsonrpc: '2.0',
        id: '2'
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },

  saveSnapshot: () => {
    return new Promise((resolve, reject) => {
      // console.log('snapshot...');
      web3.currentProvider.sendAsync({
        method: 'evm_snapshot',
        params: [],
        jsonrpc: '2.0',
        id: '2'
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.result);
        }
      });
    });
  },

  increaseTime: (timeInSeconds) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        method: 'evm_increaseTime',
        params: [timeInSeconds],
        jsonrpc: '2.0',
        id: '2'
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  mine: () => {
    return new Promise((resolve, reject) => {
      console.log('mining...');
      web3.currentProvider.sendAsync({
        method: 'evm_mine',
        params: [],
        jsonrpc: '2.0',
        id: '2'
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  stopAutoMine: () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        method: 'miner_stop',
        params: [],
        jsonrpc: '2.0',
        id: '3'
      }, (err, result) => {
        if (err) {
          console.log('error while calling miner_stop', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },

  // Took this from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/expectThrow.js
  // Doesn't seem to work any more :(
  // Changing to use the invalid opcode error instead works
  expectThrow: async (promise) => {
    try {
      await promise;
    } catch (error) {
      // TODO: Check jump destination to destinguish between a throw
      //       and an actual invalid jump.
      const invalidOpcode = error.message.search('invalid opcode') >= 0;
      // TODO: When we contract A calls contract B, and B throws, instead
      //       of an 'invalid jump', we get an 'out of gas' error. How do
      //       we distinguish this from an actual out of gas event? (The
      //       ganache log actually show an 'invalid jump' event.)
      const outOfGas = error.message.search('out of gas') >= 0;
      const revert = error.message.search('revert') >= 0;
      assert(
        invalidOpcode || outOfGas || revert,
        'Expected throw, got \'' + error + '\' instead',
      );
      return;
    }
    assert.fail('Expected throw not received');
  },
  gas,
  deployGas,
  toChecksumAddress: Web3.utils.toChecksumAddress,
  getEventsFromReceipt,
  getPastEvents,
  sendSignedTransaction(txData, to, privateKey) {
    const data = txData instanceof Object ? txData.encodeABI() : txData;
    const privateKeyHex = privateKey instanceof Buffer ? ('0x' + privateKey.toString('hex')) : privateKey;
    return web3.eth.accounts.signTransaction({data, to, gas}, privateKeyHex).then((signedTx) => {
      return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    });
  }
};
