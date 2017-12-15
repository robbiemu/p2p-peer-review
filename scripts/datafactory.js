import moment from 'moment'

export default class dataFactory {
  constructor ({name, id, className}={}) {
    this.name = name
    this.id = id
    this.class = className
  }

  genesisBlock() {
    return {
      name: this.name,
      id: this.id,
      class: this.class,
      action: 'attend'
    }
  }

  questionBlock ({
      due=moment().startOf('day').add(7, 'days').utc().format(),
      title='',
      question=''
  }={}) {
    return {
      name: this.name,
      id: this.id,
      class: this.class,
      action: 'question',
      due,
      title,
      question
    }
  }

  answerBlock ({answer, title, question}={}) {
    return {
      name: this.name,
      id: this.id,
      class: this.class,
      action: 'answer',
      title,
      answer,
      question
    }
  }

  reviewBlock ({score, review, answer}={}) {
    return {
      name: this.name,
      id: this.id,
      class: this.class,
      action: 'review',
      score,
      review,
      answer
    }    
  }
}