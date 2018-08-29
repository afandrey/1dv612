/**
 * Mongoose configuration
*/

'use strict'

let mongoose = require('mongoose')

module.exports = function () {
  // use for production 'mongodb://admin:12345@ds247407.mlab.com:47407/stickysnippets'
  let uri = 'mongodb://admin:12345@ds247407.mlab.com:47407/stickysnippets'

  mongoose.connect(uri)
  let db = mongoose.connection

  db.on('connected', function () {
    console.log('Mongoose connection open.')
  })

  db.on('error', function (err) {
    console.log('Mongoose connection error: ' + err)
  })

  db.on('disconnected', function () {
    console.log('Mongoose connection disconnected.')
  })

  process.on('SIGINT', function () {
    db.close(function () {
      console.log('Mongoose connection disconnected through app termination.')
      process.exit(0)
    })
  })

  return db
}
