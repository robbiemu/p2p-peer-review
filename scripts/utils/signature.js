import { KJUR } from 'jsrsasign'

export default class Signature {
  constructor ({
      publickey, 
      privatekey, 
      curve='secp384r1', 
      signature_algorithm='SHA256withECDSA'
  }={}) {

    this.signature_algorithm = signature_algorithm
    this.curve = curve
    
    if(!publickey || !privatekey) {
      let ec = new KJUR.crypto.ECDSA({curve})
      let keypair = ec.generateKeyPairHex()

      this.public = keypair.ecpubhex
      this.private = keypair.ecprvhex
    } else {
      this.public = publickey
      this.private = privatekey
    }
  }

  sign (data) {
    let plot = new KJUR.crypto.Signature({
      alg: this.signature_algorithm
    })
    plot.init({d: this.private, curve: this.curve})

    plot.updateString(data)

    return plot.sign()
  }

  verify (publicKey, signature, data) {
    if(!publicKey)
      publicKey = this.public

    let plot = new KJUR.crypto.Signature({
      alg: this.signature_algorithm, 
      prov: 'cryptojs/jsrsa'
    })
    plot.init({xy: publicKey, curve: this.curve})
  
    plot.updateString(data)
  
    return plot.verify(signature)
  }
  
}