/**
 * Created by Theadd on 30/09/2014.
 */

var extend = require('util')._extend
var patterns = require('./lib/patterns')
var scraper = require('./scraper')
var updater = require('./updater')

module.exports = Torrent

function Torrent (hash, announce, opts) {
  var self = this
  if (!(self instanceof Torrent)) return new Torrent(hash, announce, opts)

  self._hash = hash
  self._rawAnnounce = (typeof announce === 'string') ? [ announce ] : announce
  self._announce = []
  self._opts = opts || {}
  self._opts = extend({
    interval: 800,
    getAll: false,
    maxRetries: 3,
    updateOnScrapeFail: true,
    defaultAnnounceOnEmpty: true
  }, opts)
  self._sanitized = false
}

Torrent.prototype.sanitize = function () {
  var self = this
  self._announce = []
  for (var i in self._rawAnnounce) {
    if (patterns.isValidAnnounceURL(self._rawAnnounce[i])) {
      self._announce.push(patterns.apply(self._rawAnnounce[i]))
    }
  }
  self._sanitized = true
}

Torrent.prototype.request = function (callback) {
  var self = this

  new scraper(self._hash, self.getAnnounce(false, true), self._opts, function (err, res) {
    if (err) {
      if (self._opts.updateOnScrapeFail) {
        new updater(self._hash, self.getAnnounce(), self._opts, function (err, res) {
          callback(err, res)
        })
      } else {
        callback(err, res)
      }
    } else {
      callback(err, res)
    }
  })
}

Torrent.prototype.getAnnounce = function (raw, udpOnly) {
  var self = this, announceSet = [], i, url
  raw = raw || false
  udpOnly = udpOnly || false
  if (!raw && !self._sanitized) {
    self.sanitize()
  }
  var announce = (!raw) ? self._announce : self._rawAnnounce

  if (!announce.length && self._opts.defaultAnnounceOnEmpty) {
    announce = [
      "udp://tracker.openbittorrent.com:80/announce",
      "udp://open.demonii.com:1337/announce",
      "udp://tracker.publicbt.com:80/announce",
      "udp://tracker.istole.it:80/announce]"
    ]
  }

  if (udpOnly) {
    for (i in announce) {
      url = "udp" + announce[i].slice(announce[i].indexOf("://"))
      if (announceSet.indexOf(url) == -1) {
        announceSet.push(url)
      }
    }
  } else {
    for (i in announce) {
      if (announceSet.indexOf(announce[i]) == -1) {
        announceSet.push(announce[i])
      }
    }
  }

  return announceSet
}
