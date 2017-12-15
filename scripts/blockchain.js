import sha256 from 'crypto-js/sha256'
import Block from './block'

class Blockchain {
  constructor (genesisblock) {
    this.chain = []
    this.difficulty = 1
  }

  getLatest () {
    return this.chain[this.chain.length - 1]
  }

  add (block) {
    if(this.chain.length) {
      block.prev = this.getLatest().hash
    }
    block.mineBlock(this.difficulty)  
    this.chain.push(block)
  }
}

Blockchain.validateChain = function (chain) {
  for (let i = 1; i < chain.length; i++) {
    let block = chain[i]
    let prev = chain[i-1]

    if(block.hash !== block.calculateHash()) {
      return false
    }

    if(block.prev !== prev.hash) {
      return false
    }
  }
  return true
}

Blockchain.areEqual = function (left, right) {
  sha256(JSON.stringify(left)) === sha256(JSON.stringify(right))
}

export default Blockchain