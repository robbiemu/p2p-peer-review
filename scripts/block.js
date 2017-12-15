import sha256 from 'crypto-js/sha256'

export default class Block {
  /*
   * index (optional) - where the block sits on the chain
   * timestamp - when
   * data - data associated with the block (such as details of tx, sender, reciever)
   * prev - the previous hash
   */
  constructor (index, timestamp, nodeSignature, data, prev='') {
    this.index = index
    this.timestamp = timestamp
    this.nodeSignature = nodeSignature
    this.data = data
    this.prev = prev
    this.hash = this.calculateHash()
    this.nonce = 0
  }

  // generate a hash with the properties of a block
  calculateHash () {
    return sha256(
      this.index + 
      this.prev + 
      this.nodeSignature +
      this.timestamp + 
      JSON.stringify(this.data) +
      this.nonce
    ).toString()
  }

  // mining ensuries blockchain transaction throttling with "proof of work"
  mineBlock (difficulty) {
    while (parseInt(this.hash.substring(0, difficulty), 16)) { 
      this.nonce++
      this.hash = this.calculateHash()
    }
  }
}
