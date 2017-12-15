import moment from 'moment'

import Block from './block'
import Signature from './utils/signature'

const ui = {
  setup () {
    let tag = '[p2p-ui]'
    
    window[Symbol.for('p2p-peer-review')].addMessage = function (message) {
      let ul = document.querySelector('.p2p-log')
      
          let li = document.createElement('li')
          li.classList.add('entry')
          li.innerText = message.join(' ')
      
          ul.prepend(li)  
    }
    
    window[Symbol.for('p2p-peer-review')].showGraph = function () {
      console.log(tag + ' - showing graph')
      document.querySelector('.nav.peers').click()  
    }
    
    window[Symbol.for('p2p-peer-review')].participantsById = {}

    /* -- signature --------------------------------------------------------- */
    window[Symbol.for('p2p-peer-review')].sig = new Signature()
    document.querySelector('.public').value = 
      window[Symbol.for('p2p-peer-review')].sig.public
    document.querySelector('.private').value = 
      window[Symbol.for('p2p-peer-review')].sig.private
    
    document.querySelector('.attend').onclick = function () {
      let name = document.querySelector('input[name=name]').value
      let id = document.querySelector('.public').value
    
      if(!name) 
        return window[Symbol.for('p2p-peer-review')]
          .modal('The name and key fields are required')
    
      window[Symbol.for('p2p-peer-review')].passport = {id, name}
    
      window[Symbol.for('p2p-peer-review')].sig.public = 
        document.querySelector('.public').value
      window[Symbol.for('p2p-peer-review')].sig.private = 
        document.querySelector('.private').value
      
        window[Symbol.for('p2p-peer-review')].connect()
    }
    
    window[Symbol.for('p2p-peer-review')].connect = function () {
      window[Symbol.for('p2p-peer-review')].updateGraph(
        window[Symbol.for('p2p-peer-review')].passport)
      window[Symbol.for('p2p-peer-review')].startSwarm()
      window[Symbol.for('p2p-peer-review')].startHyperLog()
    
      document.querySelector('.signature').setAttribute('hidden', undefined)
      document.querySelector('nav').removeAttribute('hidden') 
      
      window[Symbol.for('p2p-peer-review')].prepareDataFactory()
      window[Symbol.for('p2p-peer-review')].createGenesisBlock() // we assume that we are the first on the network unless otherwise specified
    }    
    
    /* -- nav --------------------------------------------------------------- */
    document.querySelector('.nav.peers').classList.add('active')
    document.querySelectorAll('.nav').forEach(el => {
      el.onclick = function (e) {
        // if(e.target.classList.includes('active'))
        //   return
        document.querySelectorAll('.nav')
          .forEach(el => el.classList.remove('active'))
        e.target.classList.add('active')
    
        document.querySelectorAll('.view')
          .forEach(el => el.setAttribute('hidden', undefined))
        let view = Array.from(e.target.classList).filter(c => c !== 'nav')[0]
        document.querySelector('.view.' + view).removeAttribute('hidden')
      }
    })
    document.querySelectorAll('.view, nav')
      .forEach(el => el.setAttribute('hidden', undefined))

    /* -- modal ------------------------------------------------------------- */
    document.querySelector('.modal').setAttribute('hidden', undefined)
    window[Symbol.for('p2p-peer-review')].modal = function (msg) {
      document.querySelector('.modal .message').innerText = msg
      document.querySelector('.modal').removeAttribute('hidden')
    }
    
    document.querySelector('.modal .acknowledge').onclick = function () {
      document.querySelector('.modal').setAttribute('hidden', undefined)  
    }   
    
    /* -- student scores ---------------------------------------------------- */
    window[Symbol.for('p2p-peer-review')].studentScores = new Proxy([], {
      set (target, property, value, receiver) {
        if (property === 'length') {
          for (var i = value; i < length; i++) {
              delete target[i]
          }
          length = value
          return true
        }

        if(target.length > 0) {
          let foundReview = target.every(r => {
            r.student.id === value.student.id &&
            r.reviewer.id === value.reviewer.id &&
            r.question.title === value.question.title
          })
          if(foundReview)
            return true  
        }

        target[property] = value

        let ul = document.querySelector('.student-scores')
        let li = document.createElement('li')
        li.classList.add('student-score')
        
        let name = document.createElement('span')
        name.classList.add('student-name')
        name.innerText = value.student.name
        li.appendChild(name)

        let submission = document.createElement('span')
        submission.classList.add('student-submission')
        submission.innerText = ` (to ${value.question.title}) ${value.answer.title}`
        li.appendChild(submission)

        let review = document.createElement('span')
        review.classList.add('student-scoring')
        review.innerText = ` ${value.review.score} [by ${value.reviewer.name}]`
        li.appendChild(review)

        ul.appendChild(li)
        return true
      }
    })
    
    /* -- question ---------------------------------------------------------- */
    document.querySelector('.generate-question-due-date').onclick = 
      function () {
        document.querySelector('[name=question-due]').value = 
          moment().startOf('day').add(7, 'days').utc().format()
      }
    
    document.querySelector('.submit-question').onclick = function () {
      if(!window[Symbol.for('p2p-peer-review')].isValidQuestion())
        return window[Symbol.for('p2p-peer-review')]
          .modal('all question fields are required')
    
      let questionData = window[Symbol.for('p2p-peer-review')]
        .dataFactory.questionBlock(
          window[Symbol.for('p2p-peer-review')].getQuestionFields())

      let JSONdata = JSON.stringify(questionData)
    
      let questionBlock = new Block(
        window[Symbol.for('p2p-peer-review')].blockchain.chain
          .reduce((p,c) => c.index>p?c.index:p,0) + 1, 
        new Date().getTime(),
        window[Symbol.for('p2p-peer-review')].sig.sign(JSONdata),
        questionData
      )
    
      window[Symbol.for('p2p-peer-review')].blockchain.add(questionBlock)

      let JSONblockchain = JSON.stringify(
        window[Symbol.for('p2p-peer-review')].blockchain.chain)
      
      window[Symbol.for('p2p-peer-review')].submitToHyperLog(JSONblockchain)
    
      window[Symbol.for('p2p-peer-review')].resetQuestion()
    }
    
    window[Symbol.for('p2p-peer-review')].isValidQuestion = function () {
      let selector = '[name=question-title], .question, [name=question-due]'
      return Array.from(document.querySelectorAll(selector))
        .every(el => el.value)
    }
    
    window[Symbol.for('p2p-peer-review')].getQuestionFields = function () {
      return {
        title: document.querySelector('[name=question-title]').value,
        question: document.querySelector('.question').value,
        due: document.querySelector('[name=question-due]').value
      }
    }
    
    window[Symbol.for('p2p-peer-review')].resetQuestion = function () {
      document.querySelectorAll('[name=question-title], .question')
        .forEach(el => el.value = '')
      document.querySelector('[name=question-due]').value = 
        moment().startOf('day').add(7, 'days').utc().format()
    }
    window[Symbol.for('p2p-peer-review')].resetQuestion()
    
    window[Symbol.for('p2p-peer-review')].setupQuestions = function () {
      let usersEl = document.querySelector('.answer-questions-user')
      usersEl.onchange = () => window[Symbol.for('p2p-peer-review')]
        .selectQuestionsOfUser(usersEl.value)  
    
      let questionsEl = document.querySelector('.answer-questions')  
      questionsEl.onchange = () => window[Symbol.for('p2p-peer-review')]
        .showQuestion(usersEl.value, questionsEl.value)
    }
    
    window[Symbol.for('p2p-peer-review')].questionsByOwner = new Proxy({}, {
      set (target, property, value, receiver) {
        target[property] = value;

        let usersEl = document.querySelector('.answer-questions-user')
        usersEl.innerHTML = '<option disabled selected value> -- select a user -- </option>'
    
        for(let uid of Object.keys(target)) {
          if(uid === window[Symbol.for('p2p-peer-review')].passport.id)
            continue
    
          let option = document.createElement('option')
          option.value = uid
          option.innerText = window[Symbol.for('p2p-peer-review')]
            .participantsById[uid]
    
          usersEl.appendChild(option)
        }
        
        return true
      }
    })
    
    window[Symbol.for('p2p-peer-review')].selectQuestionsOfUser = 
      function (uid) {
        if(uid === window[Symbol.for('p2p-peer-review')].passport.id)
          return
      
        let questionsEl = document.querySelector('.answer-questions')
        questionsEl.innerHTML = '<option disabled selected value> -- select a question -- </option>'
      
        window[Symbol.for('p2p-peer-review')].questionsByOwner[uid]
          .forEach((question, index) => {
              let option = document.createElement('option')
              option.value = index
              option.innerText = question.title
        
              questionsEl.appendChild(option)
          })
      }
    
    window[Symbol.for('p2p-peer-review')].showQuestion = function (uid, index) {
      let questionEl = document.querySelector('.question-to-answer')
      questionEl.innerHTML = window[Symbol.for('p2p-peer-review')]
        .questionsByOwner[uid][index].question

        window[Symbol.for('p2p-peer-review')].questionShown = {uid, index}
    }
    
    window[Symbol.for('p2p-peer-review')].setupQuestions()
    
    /* -- answer ------------------------------------------------------------ */
    document.querySelector('.submit-answer').onclick = function (e) {
      let title = document.querySelector('[name=answer-title]').value
      let answer = document.querySelector('.answer').value

      let q = window[Symbol.for('p2p-peer-review')].questionShown
      let question = window[Symbol.for('p2p-peer-review')]
        .questionsByOwner[q.uid][q.index]

      if(!answer || !title)
        return window[Symbol.for('p2p-peer-review')]
          .modal('please submit an answer with title')

      let answerData = window[Symbol.for('p2p-peer-review')]
        .dataFactory.answerBlock({answer, title, question})

      let JSONdata = JSON.stringify(answerData)
    
      let answerBlock = new Block(
        window[Symbol.for('p2p-peer-review')].blockchain.chain
          .reduce((p,c) => c.index>p?c.index:p,0) + 1, 
        new Date().getTime(),
        window[Symbol.for('p2p-peer-review')].sig.sign(JSONdata),
        answerData
      )
    
      window[Symbol.for('p2p-peer-review')].blockchain.add(answerBlock)

      let JSONblockchain = JSON.stringify(
        window[Symbol.for('p2p-peer-review')].blockchain.chain)
      
      window[Symbol.for('p2p-peer-review')].submitToHyperLog(JSONblockchain)

      window[Symbol.for('p2p-peer-review')].questionShown = {}      

      document.querySelector('.answer').value = ''
      document.querySelector('[name=answer-title]').value = ''
      document.querySelector('.answer-questions-user').selectedIndex = -1
      document.querySelector('.answer-questions').selectedIndex = -1
    }

    window[Symbol.for('p2p-peer-review')].setupAnswers = function () {
      let questionsEl = document.querySelector('.review-questions')
      questionsEl.onchange = () => window[Symbol.for('p2p-peer-review')]
        .selectAnswersOfQuestion(questionsEl.value)  
    
      let answersEl = document.querySelector('.review-answers')  
      answersEl.onchange = () => window[Symbol.for('p2p-peer-review')]
        .showAnswer(questionsEl.value, answersEl.value)
    }

    window[Symbol.for('p2p-peer-review')].answersByQuestion = new Proxy([], {
      set (target, property, value, receiver) {
        target[property] = value;
    
        let questionsEl = document.querySelector('.review-questions')
        questionsEl.innerHTML = '<option disabled selected value> -- select a question -- </option>'
    
        for(let JSONquestion of Object.keys(target)) {
          let question = JSON.parse(JSONquestion)

          if(target[JSONquestion].id === window[Symbol.for('p2p-peer-review')]
              .passport.id) // user submitted answer
            continue

          let option = document.createElement('option')
          option.value = JSONquestion
          option.innerText = question.title
    
          questionsEl.appendChild(option)
        }
        
        return true
      }
    })
    
    window[Symbol.for('p2p-peer-review')].selectAnswersOfQuestion = 
      function (index) {
        let answersEl = document.querySelector('.review-answers')
        answersEl.innerHTML = '<option disabled selected value> -- select an answer -- </option>'

        window[Symbol.for('p2p-peer-review')].answersByQuestion[index]
          .forEach((answer, index) => {
              if(!(answer.id === 
                  window[Symbol.for('p2p-peer-review')].passport.id)) {

                let option = document.createElement('option')
                option.value = index
                option.innerText = answer.title
          
                answersEl.appendChild(option)
              }
          })
      }

    window[Symbol.for('p2p-peer-review')].showAnswer = 
      function (questionId, index) {
        let answerEl = document.querySelector('.answer-to-review')
        answerEl.innerHTML = window[Symbol.for('p2p-peer-review')]
          .answersByQuestion[questionId][index].answer

        window[Symbol.for('p2p-peer-review')].answerShown = 
          {questionId, index}
      }
    
    window[Symbol.for('p2p-peer-review')].setupAnswers()  
    
    /* -- review ------------------------------------------------------------ */
    document.querySelector('.submit-review').onclick = function (e) {
      if(!window[Symbol.for('p2p-peer-review')].isValidReview())
        return window[Symbol.for('p2p-peer-review')]
          .modal('all review fields are required')
  
      let reviewData = window[Symbol.for('p2p-peer-review')]
        .dataFactory.reviewBlock(
          window[Symbol.for('p2p-peer-review')].getReviewFields())

      let JSONdata = JSON.stringify(reviewData)
    
      let reviewBlock = new Block(
        window[Symbol.for('p2p-peer-review')].blockchain.chain
          .reduce((p,c) => c.index>p?c.index:p,0) + 1, 
        new Date().getTime(),
        window[Symbol.for('p2p-peer-review')].sig.sign(JSONdata),
        reviewData
      )
    
      window[Symbol.for('p2p-peer-review')].blockchain.add(reviewBlock)

      let JSONblockchain = JSON.stringify(
        window[Symbol.for('p2p-peer-review')].blockchain.chain)
      
      window[Symbol.for('p2p-peer-review')].submitToHyperLog(JSONblockchain)
    
      window[Symbol.for('p2p-peer-review')].resetReview()
    }

    window[Symbol.for('p2p-peer-review')].getReviewFields = function () {
      let a = window[Symbol.for('p2p-peer-review')].answerShown
      let answer = window[Symbol.for('p2p-peer-review')]
        .answersByQuestion[a.questionId][a.index]

      return {
        score: document.querySelector('[name=numeric-evaluation]').value,
        review: document.querySelector('textarea.review').value,
        answer
      }
    }

    window[Symbol.for('p2p-peer-review')].isValidReview = function () {
      let selector = '[name=numeric-evaluation], textarea.review'
      return Array.from(document.querySelectorAll(selector))
        .every(el => el.value)
    }

    window[Symbol.for('p2p-peer-review')].resetReview = function () {
      document.querySelector('[name=numeric-evaluation]').value = null
      document.querySelector('textarea.review').value = ''    
      document.querySelectorAll('.review-questions, .review-answers')
        .forEach(el => {
          el.selectedIndex = -1
        })

      window[Symbol.for('p2p-peer-review')].answerShown = {}
    }
    window[Symbol.for('p2p-peer-review')].resetReview()
    
  }
}

export default ui
