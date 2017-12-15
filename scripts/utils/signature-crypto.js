import crypto from 'crypto'
import keypair from 'keypair'

export default class Signature {
  constructor ({
      publickey, 
      privatekey
  }={}) {
    
    if(!publickey || !privatekey) {
      let keys = keypair()
      
      this.public = keys.public.replace(/\r/g,'')
      this.private = keys.private.replace(/\r/g,'')
    } else {
      this.public = publickey
      this.private = privatekey
    }
  }

  sign (data) {
    const sign = crypto.createSign('RSA-SHA256')

    sign.write(data)
    sign.end()
    
    return sign.sign(this.private, 'hex')
  }

  verify (publicKey, signature, data) {
    if(!publicKey)
      publicKey = this.public

    const verify = crypto.createVerify('RSA-SHA256');
    
    verify.write(data);
    verify.end();
        
    return verify.verify(publicKey, signature)
  }
}
