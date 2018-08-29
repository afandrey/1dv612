/**
 * Routes
*/

'use strict'

let router = require('express').Router()
let passport = require('passport')
let octonode = require('octonode')
let Webhook = require('../models/Webhook.js')
let LastMessage = require('../models/LastMessage.js')

router.route('/').get(function (req, res) {
  if (req.user) {
    LastMessage.find({ username: req.user.username }, function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.length > 0) {
        let context = {
          items: result.map(function (item) {
            return {
              username: item.username,
              message: item.message,
              date: item.date
            }
          })
        }
        res.render('home/index', { user: req.user, messages: context.items })
      } else {
        res.render('home/index', { user: req.user })
      }
    })
  } else {
    res.render('home/index')
  }
})

router.route('/remove').get(ensureAuthenticated, function (req, res, next) {
  LastMessage.find({ username: req.user.username }, function (err, result) {
    if (err) {
      console.log(err)
    }
    if (result.length > 0) {
      LastMessage.remove({ username: req.user.username }, function (err) {
        if (err) {
          req.session.flash = {
            type: 'danger',
            message: 'Something went wrong when trying to remove saved messages!'
          }
          res.redirect('/')
        }
        req.session.flash = {
          type: 'success',
          message: 'Removed all saved notifications!'
        }
        res.redirect('/')
      })
    } else {
      req.session.flash = {
        type: 'danger',
        message: 'Could not find any saved notifications!'
      }
      res.redirect('/')
    }
  })
})

router.get('/auth/github',
  passport.authenticate('github', { scope: [ 'read:org, user, repo, write:repo_hook, write:org, admin:org_hook' ] }),
  function (req, res) {}
)

router.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/home/index' }),
  function (req, res) {
    res.app.set('login', true)
    req.session.flash = {
      type: 'success',
      message: 'Successfully logged in!'
    }
    res.redirect('/')
  })

router.route('/orgs').get(ensureAuthenticated, function (req, res) {
  let client = octonode.client(req.user.token)
  let ghme = client.me()
  ghme.orgs(function (err, data, headers) {
    if (err) {
      console.log(err)
    }
    let orgnames = []

    for (let i = 0; i < data.length; i++) {
      orgnames.push(data[i].login)
    }

    res.render('github/orgs', { user: req.user, orgs: orgnames })
  })
}).post(ensureAuthenticated, function (req, res) {
  Webhook.findOne({ username: req.user.username, org: req.body.org }, function (err, result) {
    if (err) {
      console.log(err)
    }
    if (result === null) {
      let events = ['issues', 'push', 'release', 'repository']
      let client = octonode.client(req.user.token)
      let ghorg = client.org(req.body.org)
      ghorg.hook({
        'name': 'web',
        'active': true,
        'events': events,
        'config': {
          'content_type': 'json',
          'insecure_ssl': '1',
          'secret': process.env['HOOK_SECRET'],
          'url': 'https://138.68.160.157/'
        }
      }, function (err, status, body, headers) {
        console.log(err)
        console.log(status)
        console.log(body)
        console.log(headers)
      })

      let webhook = new Webhook({
        username: req.user.username,
        org: req.body.org,
        events: events,
        email: req.user._json.email
      })
      webhook.save().then(function () {
        req.session.flash = {
          type: 'success',
          message: 'Webhook added to organization!'
        }
        res.redirect('/')
      }).catch(function () {
        req.session.flash = {
          type: 'danger',
          message: 'Something went wrong when trying to create webhook!'
        }
      })
    } else {
      req.session.flash = {
        type: 'danger',
        message: 'Webhook already exists for organization!'
      }
      res.redirect('/')
    }
  })
})

router.route('/settings').get(ensureAuthenticated, function (req, res) {
  Webhook.find({ username: req.user.username }, function (err, result) {
    if (err) {
      console.log(err)
    }
    if (result === null) {
      req.session.flash = {
        type: 'danger',
        message: 'Could not find webhook settings for user!'
      }
      res.redirect('/')
    } else {
      let context = {
        items: result.map(function (item) {
          return {
            id: item._id,
            username: item.username,
            org: item.org,
            events: item.events,
            notify: item.notify
          }
        })
      }
      res.render('github/settings', { user: req.user, settings: context.items })
    }
  })
}).post(ensureAuthenticated, function (req, res) {
  Webhook.find({ username: req.user.username }, function (err, result) {
    if (err) {
      console.log(err)
    }
    if (result === null) {
      req.session.flash = {
        type: 'danger',
        message: 'Could not find webhook settings for user!'
      }
      res.redirect('/')
    } else {
      if (req.body.events !== undefined) {
        Webhook.findOne({ org: result[0].org, username: req.user.username }, function (err, res) {
          if (err) {
            console.log(err)
          }
          res.events = req.body.events
          res.save().then(function () {
          })
        })
      } else if (req.body.optradio) {
        Webhook.findOne({ org: result[0].org, username: req.user.username }, function (err, res) {
          if (err) {
            console.log(err)
          }
          res.notify = req.body.optradio
          res.save().then(function () {
          })
        })
      }
      req.session.flash = {
        type: 'success',
        message: 'Settings changed!'
      }
      res.redirect('/')
    }
  })
})

router.route('/delete/:id').get(ensureAuthenticated, function (req, res, next) {
  Webhook.findOneAndRemove({ _id: req.params.id }, function (err) {
    if (err) {
      next(err)
    }
    req.session.flash = {
      type: 'success',
      message: 'Webhook was deleted!'
    }
    res.redirect('/')
  })
})

router.route('/logout').get(function (req, res) {
  res.app.set('login', false)
  req.session.flash = {
    type: 'success',
    message: 'Successfully logged out!'
  }
  req.logout()
  res.redirect('/')
})

function ensureAuthenticated (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  req.session.flash = {
    type: 'danger',
    message: 'You need to login!'
  }
  res.redirect('/')
}

module.exports = router
