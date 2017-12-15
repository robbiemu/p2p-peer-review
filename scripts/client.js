/* based on https://www.reddit.com/r/javascript/comments/5kdy4m/best_webrtc_library/#siteTable_t1_dboe0a9 */

import level from 'level-browserify' // provides a fs-like abstraction
import hyperlog from 'hyperlog' // provides a ledger of transactions
import wswarm from 'webrtc-swarm' // provides a p2p network
import signalhub from 'signalhub' // provides service to connect to p2p network
import concat from 'concat-stream' // reduces a stream from a buffer

import moment from 'moment'
import P2Pgraph from 'p2p-graph' // visualization

import Block from './block'
import Blockchain from './blockchain'
import DataFactory from './datafactory'

import config from '../config'
import ui from './ui'

const tag = '[p2p-client]'

window[Symbol.for('p2p-peer-review')] = {}
window[Symbol.for('p2p-peer-review')].passport = {}

/* -- graph ----------------------------------------------------------------- */
window[Symbol.for('p2p-peer-review')].graph = new P2Pgraph('.p2p-graph')

window[Symbol.for('p2p-peer-review')].resetGraph = function () {
  document.querySelector('.p2p-graph').innerHTML = ''
  
  window[Symbol.for('p2p-peer-review')].graph = new P2Pgraph('.p2p-graph')
}

window[Symbol.for('p2p-peer-review')].updateGraph = function (swarmnode) {
  let node = {...swarmnode}
  if(node.id === window[Symbol.for('p2p-peer-review')].passport.id) {
    node.me = true
  } else if (node.name === 'You') {
    node.name = 'Anonymous'
  }

  let nodes = window[Symbol.for('p2p-peer-review')].graph.list()
  let isChangedItemInGraph = nodes.some((n,i) =>
    n.id === node.id && n.name !== node.name)
  let isItemInGraph = nodes.some(n => n.id === node.id)

  if (isChangedItemInGraph || !isItemInGraph) {
    if (isChangedItemInGraph)
      try {
        window[Symbol.for('p2p-peer-review')].graph.remove(node.id)
      } catch (e) { console.error(e) }

      window[Symbol.for('p2p-peer-review')].graph.add(node)

    if (!(node.me || window[Symbol.for('p2p-peer-review')].graph.areConnected(
        window[Symbol.for('p2p-peer-review')].passport.id, 
        node.id)))
      window[Symbol.for('p2p-peer-review')].graph.connect(
        window[Symbol.for('p2p-peer-review')].passport.id, node.id)
  }
}

/* -- swarm ----------------------------------------------------------------- */
window[Symbol.for('p2p-peer-review')].getOutgoing = 
  function (outgoingSignalingData) {
    return {
      passport: window[Symbol.for('p2p-peer-review')].passport,
      payload: outgoingSignalingData
    }
  }

window[Symbol.for('p2p-peer-review')].swarmOpts = Object.assign({}, {
  wrap: (outgoingSignalingData, destinationSignalhubChannel) => {
    return window[Symbol.for('p2p-peer-review')]
      .getOutgoing(outgoingSignalingData)
  },
  unwrap: (incomingData, sourceSignalhubChannel) => {
    window[Symbol.for('p2p-peer-review')].updateGraph(incomingData.passport)

    return incomingData.payload
  }
})

window[Symbol.for('p2p-peer-review')].startSwarm = function () { 
  console.log(tag + ' - starting WebRTC Swarm')
  
  window[Symbol.for('p2p-peer-review')].swarm = wswarm(
    signalhub(config.signalhub.channel, config.signalhub.hubs),
    window[Symbol.for('p2p-peer-review')].swarmOpts
  )

  // handle swarm tx
  window[Symbol.for('p2p-peer-review')].swarm.on('peer', (peer, id) => { // handle p2p transmission
    let replicate = window[Symbol.for('p2p-peer-review')].log.replicate({
      live: true
    })
    peer.pipe(replicate).pipe(peer)

    console.info('connected to a new peer:', id)
    console.info('total peers:', 
      window[Symbol.for('p2p-peer-review')].swarm.peers.length)
  })

  window[Symbol.for('p2p-peer-review')].swarm.on('disconnect', 
    function (peer, id) {
      window[Symbol.for('p2p-peer-review')].graph.disconnect(
        window[Symbol.for('p2p-peer-review')].passport.id, id)
      window[Symbol.for('p2p-peer-review')].graph.remove(id)

      console.info('disconnected from a peer:', id)
      console.info('total peers:', 
        window[Symbol.for('p2p-peer-review')].swarm.peers.length)
    })
}

window.onbeforeunload = function () {
  if(window[Symbol.for('p2p-peer-review')].swarm)
    window[Symbol.for('p2p-peer-review')].swarm.close()
}

/* -- hyperlog -------------------------------------------------------------- */
window[Symbol.for('p2p-peer-review')].db = level('db')
window[Symbol.for('p2p-peer-review')].log
window[Symbol.for('p2p-peer-review')].logIndex = 0
window[Symbol.for('p2p-peer-review')].genesisIdentity = undefined // the identity signing the genesis block

window[Symbol.for('p2p-peer-review')].startHyperLog = function () {
  console.log(tag + ' - starting HyperLog')

  window[Symbol.for('p2p-peer-review')].log = 
    hyperlog(window[Symbol.for('p2p-peer-review')].db, config.hyperlog.config)

  window[Symbol.for('p2p-peer-review')].logIndex = 0
  // handle ledger relay
  window[Symbol.for('p2p-peer-review')].log.on('add', function () {
    window[Symbol.for('p2p-peer-review')].log.createReadStream()
      .pipe(concat(body => { 
        console.info(tag + ' - add', body)

        for(
          let index = window[Symbol.for('p2p-peer-review')].logIndex; 
          index < body.length; 
          index++
        ) {
          let latest = body[index]      
      
          let message = []
          if (latest.value.passport.name)  {
            let name = latest.value.passport.name
      
            message.push(name)
          } else if (latest.value.passport.id) {
            message.push(`[${latest.value.passport.id}]`)
          }
      
          let bcCandidate = JSON.parse(latest.value.message).map(block => {
            let b = new Block(
              block.index, 
              block.timestamp, 
              block.nodeSignature, 
              block.data,
              block.prev
            )
            b.hash = block.hash
            b.nonce = block.nonce
            return b
          })

          if(!Blockchain.areEqual(
                window[Symbol.for('p2p-peer-review')].blockchain.chain, 
                bcCandidate)
          ) { // this was our own push when these are equal
      
            if(!Blockchain.validateChain(bcCandidate))
              return console.warn(tag + ' - apparent fabrication on the chain', 
                bcCandidate)
              
            let badBlock = bcCandidate.find(block =>
              !window[Symbol.for('p2p-peer-review')].sig.verify(
                block.data.id, 
                block.nodeSignature, 
                JSON.stringify(block.data)
              ))

            if(badBlock)
              return console.warn(tag + ' - falsified submission', badBlock)

            console.info(tag + ' - validated blockchain')

            if(window[Symbol.for('p2p-peer-review')].blockchain.chain.length < 
                bcCandidate.length)
              window[Symbol.for('p2p-peer-review')].blockchain.chain = 
                bcCandidate
          }
          
          message.push(`[${ moment().format('HH:mm') }]`)
          message.push(bcCandidate[bcCandidate.length - 1].data.action)
      
          window[Symbol.for('p2p-peer-review')].addMessage(message)  
      
          window[Symbol.for('p2p-peer-review')].logIndex++      
        }

        window[Symbol.for('p2p-peer-review')].processChain()
      }))
  })
}

window[Symbol.for('p2p-peer-review')].atEntry = true
window[Symbol.for('p2p-peer-review')].submitToHyperLog = function (message) {
  console.info(tag + ' - submit', message)

  window[Symbol.for('p2p-peer-review')].log.append(
    {passport: window[Symbol.for('p2p-peer-review')].passport, message}, 
    (err, node) => {
      if (err) console.error(tag + '- log.add error', err, node)
      if(window[Symbol.for('p2p-peer-review')].atEntry) {
        window[Symbol.for('p2p-peer-review')].showGraph()
        window[Symbol.for('p2p-peer-review')].atEntry = false
      }
    })
}

/* -- blockchain ------------------------------------------------------------ */
window[Symbol.for('p2p-peer-review')].blockchain = new Blockchain()

window[Symbol.for('p2p-peer-review')].prepareDataFactory = function () {
  console.log(tag + ' - preparing dataFactory to generate data for blocks')

  let defaults = {
    name: window[Symbol.for('p2p-peer-review')].passport.name, 
    id: window[Symbol.for('p2p-peer-review')].passport.id, 
    className: config.signalhub.channel
  }
  window[Symbol.for('p2p-peer-review')].dataFactory = new DataFactory(defaults)
}

window[Symbol.for('p2p-peer-review')].createGenesisBlock = function () {
  let genesisClass = window[Symbol.for('p2p-peer-review')]
    .dataFactory.genesisBlock()

  let genesisBlock = new Block(
    0, 
    new Date().getTime(),
    window[Symbol.for('p2p-peer-review')]
      .sig.sign(JSON.stringify(genesisClass)),
    genesisClass
  )

  window[Symbol.for('p2p-peer-review')].blockchain.add(genesisBlock)
  
  window[Symbol.for('p2p-peer-review')].submitToHyperLog(
    JSON.stringify(window[Symbol.for('p2p-peer-review')].blockchain.chain))
}

window[Symbol.for('p2p-peer-review')].processChain = function () {
  Object.keys(window[Symbol.for('p2p-peer-review')].questionsByOwner)
    .forEach(key => 
      delete window[Symbol.for('p2p-peer-review')].questionsByOwner[key])
  Object.keys(window[Symbol.for('p2p-peer-review')].answersByQuestion)
    .forEach(key => 
      delete window[Symbol.for('p2p-peer-review')].answersByQuestion[key])
  
  window[Symbol.for('p2p-peer-review')].blockchain.chain.forEach(block => {
    if(!window[Symbol.for('p2p-peer-review')].participantsById[block.data.id])
      window[Symbol.for('p2p-peer-review')].participantsById[block.data.id] = 
        block.data.name

    switch(block.data.action) {
      case 'question':
        if(!window[Symbol.for('p2p-peer-review')]
            .questionsByOwner[block.data.id])
          window[Symbol.for('p2p-peer-review')].questionsByOwner[block.data.id] 
            = []
        window[Symbol.for('p2p-peer-review')].questionsByOwner[block.data.id]
          .push(block.data)
        break
      case 'answer':
        let JSONquestion = JSON.stringify(block.data.question)
        if(!window[Symbol.for('p2p-peer-review')]
            .answersByQuestion[JSONquestion])
          window[Symbol.for('p2p-peer-review')]
            .answersByQuestion[JSONquestion] = []
        window[Symbol.for('p2p-peer-review')]
          .answersByQuestion[JSONquestion].push(block.data)
        break
      case 'review':
        console.log(block.data)
        window[Symbol.for('p2p-peer-review')].studentScores.push({
          review: {
            review: block.data.review,
            score: block.data.score
          },
          reviewer: {
            name: block.data.name,
            id: block.data.id
          },
          student: {
            name: block.data.answer.name,
            id: block.data.answer.id
          },
          question: {
            title: block.data.answer.question.title,
            question: block.data.answer.question.question
          },
          answer: {
            title: block.data.answer.title,
            answer: block.data.answer
          }
        })
        break
    }
  })
}

/* -- ui -------------------------------------------------------------------- */
ui.setup()
