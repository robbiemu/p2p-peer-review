
export default {
  signalhub: {
    channel: 'p2p-peer-review',
    hubs: ['http://localhost:8099']
  },
  hyperlog: {
    config: {
      valueEncoding: 'json'
    }
  },
  periodicities: {
    'every 15 minutes': 900000,
    'weekly': 604800000
  }
}
