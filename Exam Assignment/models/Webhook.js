let mongoose = require('mongoose')

let webhookSchema = mongoose.Schema({
  org: { type: String, required: true },
  username: { type: String, required: true },
  events: { type: Object, required: true },
  email: { type: String, required: true },
  notify: { type: Boolean, required: true, default: true }
})

let Webhook = mongoose.model('Webhook', webhookSchema)

module.exports = Webhook
