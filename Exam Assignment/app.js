/**
 * Starting point of application
*/

'use strict'
require('dotenv').config()
let express = require('express')
let exphbs = require('express-handlebars')
let bodyParser = require('body-parser')
let path = require('path')
let passport = require('passport')
let session = require('express-session')
let nodemailer = require('nodemailer')
let GitHubStrategy = require('passport-github2').Strategy

let GitHubWebhook = require('express-github-webhook')
let webhookHandler = GitHubWebhook({ path: '/', secret: process.env['HOOK_SECRET']})
let Webhook = require('./models/Webhook.js')
let LastMessage = require('./models/LastMessage.js')

let https = require('https')
let fs = require('fs')
let port = 3000
let app = express()

let options = {
  key: fs.readFileSync('./config/sslcerts/key.pem'),
  cert: fs.readFileSync('./config/sslcerts/cert.pem')
}
let server = https.createServer(options, app)
let io = require('socket.io')(server)

let mongoose = require('./config/mongoose.js')
mongoose()

app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}))
app.set('view engine', '.hbs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, '/public')))
app.use(webhookHandler)

app.use(session({
  secret: 'fEy4Kj6GEceyTJuhSS2H',
  resave: false,
  saveUninitialized: false
}))

// Flash messages
app.use(function (req, res, next) {
  if (req.session.flash) {
    res.locals.flash = req.session.flash

    delete req.session.flash
  }
  next()
})

// Passport Authentication
passport.serializeUser(function (user, done) {
  done(null, user)
})
passport.deserializeUser(function (obj, done) {
  done(null, obj)
})

passport.use(new GitHubStrategy({
  clientID: process.env['CLIENT_ID'],
  clientSecret: process.env['CLIENT_SECRET'],
  callbackURL: 'https://138.68.160.157/auth/github/callback'
// callbackURL: 'https://localhost:3000/auth/github/callback'
},
  function (accessToken, refreshToken, profile, done) {
    profile.token = accessToken
    return done(null, profile)
  }
))
app.use(passport.initialize())
app.use(passport.session())

webhookHandler.on('*', function (event, repo, data) {
  if (event === 'issues' || event === 'push' || event === 'release' || event === 'repository') {
    Webhook.find({ org: data.repository.owner.login }, function (err, result) {
      if (err) {
        console.log(err)
      }
      for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result[i].events.length; j++) {
          if (result[i].events[j] === event) {
            console.log('event found')
            if (result[i].notify) {
              console.log('send email notification')
              let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: process.env['MAIL'],
                  pass: process.env['MAIL_PASSWORD']
                }
              })
              if (event === 'issues' || event === 'release' || event === 'repository') {
                let msg = 'New ' + event + ' notification! Action: ' + data.action + ', by User: ' + data.sender.login + ', in Repository: ' + data.repository.name + ', Organization: ' + data.organization.login
                let mailOptions = {
                  from: process.env['MAIL'],
                  to: result[i].email,
                  subject: 'GitHub Dashboard Notification',
                  text: msg
                }
                transporter.sendMail(mailOptions, function (err, info) {
                  if (err) {
                    console.log(err)
                  } else {
                    console.log('Email send: ' + info.response)
                  }
                })
              } else if (event === 'push') {
                let msg = 'New ' + event + ' notification! Message: ' + data.head_commit.message + ', by User: ' + data.sender.login + ', in Repository: ' + data.repository.name + ', Organization: ' + data.organization.login
                let mailOptions = {
                  from: process.env['MAIL'],
                  to: result[i].email,
                  subject: 'GitHub Dashboard Notification',
                  text: msg
                }
                transporter.sendMail(mailOptions, function (err, info) {
                  if (err) {
                    console.log(err)
                  } else {
                    console.log('Email send: ' + info.response)
                  }
                })
              }
            }
            if (!app.get('login')) {
              console.log('save notification in db.')
              if (event === 'issues' || event === 'release' || event === 'repository') {
                let msg = 'New ' + event + ' notification! Action: ' + data.action + ', by User: ' + data.sender.login + ', in Repository: ' + data.repository.name + ', Organization: ' + data.organization.login
                let saveMsg = new LastMessage({
                  username: result[i].username,
                  message: msg
                })
                saveMsg.save().then(function () {
                  console.log('notification saved.')
                }).catch(function (err) {
                  console.log(err)
                })
              } else if (event === 'push') {
                let msg = 'New ' + event + ' notification! Message: ' + data.head_commit.message + ', by User: ' + data.sender.login + ', in Repository: ' + data.repository.name + ', Organization: ' + data.organization.login
                let saveMsg = new LastMessage({
                  username: result[i].username,
                  message: msg
                })
                saveMsg.save().then(function () {
                  console.log('notification saved.')
                }).catch(function (err) {
                  console.log(err)
                })
              }
            }
          }
        }
      }
    })
  }
})

io.on('connection', function (socket) {
  if (app.get('login')) {
    webhookHandler.on('*', function (event, repo, data) {
      if (event === 'issues' || event === 'push' || event === 'release' || event === 'repository') {
        Webhook.findOne({ org: data.repository.owner.login }, function (err, result) {
          if (err) {
            console.log(err)
          }
          if (event === 'issues' || event === 'release' || event === 'repository') {
            socket.emit('msg', { event: event, action: data.action, user: data.sender.login, repo: data.repository.name, org: data.organization.login })
          } else if (event === 'push') {
            socket.emit('pushmsg', { event: event, message: data.head_commit.message, user: data.sender.login, repo: data.repository.name, org: data.organization.login })
          }
        })
      }
    })
  }
})

webhookHandler.on('error', function (err, req, res) {
  if (err) {
    console.log(err)
  }
})

// Routes
app.use('/', require('./routes/home.js'))

// 404 error handler
app.use(function (req, res, next) {
  res.status(404).render('error/404')
})

// 400 error handler
app.use(function (err, req, res, next) {
  if (err.status !== 400) {
    return next(err)
  }
  console.error(err.stack)
  res.status(400).render('error/400')
})

// 500 error handler
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).render('error/500')
})

// Launch application
server.listen(port, function () {
  console.log('Express app listening on port ' + port)
  console.log('Press Ctrl-C to terminate...')
})
