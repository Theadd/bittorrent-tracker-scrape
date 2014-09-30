/**
 * Created by Theadd on 30/09/2014.
 */

var extend = require('util')._extend
var patterns = require('./lib/patterns')
var scraper = require('./scraper')

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
    maxRetries: 3
  }, opts)
}

Torrent.prototype.sanitize = function () {
  var self = this
  self._announce = []
  for (var i in self._rawAnnounce) {
    if (patterns.isValidAnnounceURL(self._rawAnnounce[i])) {
      self._announce.push(patterns.apply(self._rawAnnounce[i]))
    }
  }
}

Torrent.prototype.request = function (callback) {
  var self = this

  new scraper(self._hash, self.getAnnounce(false, true), self._opts, callback)
}

Torrent.prototype.getAnnounce = function (raw, udpOnly) {
  raw = raw || false
  udpOnly = udpOnly || false
  var self = this,
    announce = (!raw && self._announce.length) ? self._announce : self._rawAnnounce

  if (udpOnly) {
    var udpAnnounce = []
    for (var i in announce) {
      udpAnnounce.push("udp" + announce[i].slice(announce[i].indexOf("://")))
    }
  } else {
    return announce
  }
}
