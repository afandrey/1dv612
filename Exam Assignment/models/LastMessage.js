let mongoose = require('mongoose')

let messageSchema = mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  username: { type: String, required: true },
  message: { type: String, required: true }
})

let LastMessage = mongoose.model('LastMessage', messageSchema)

module.exports = LastMessage
