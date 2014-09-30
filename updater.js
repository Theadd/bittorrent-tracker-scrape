/**
 * Created by Theadd on 30/09/2014.
 */

var extend = require('util')._extend
var BittorrentTracker = require('bittorrent-tracker')
var common = require('./lib/common')

module.exports = Updater

function Updater (hash, announce, opts, cb) {
  var self = this

  self._results = []
  self._hash = hash
  self._announce = (typeof announce === 'string') ? [ announce ] : announce
  self._opts = opts || {}
  self._opts = extend({
    interval: 800,
    getAll: false,
    maxRetries: 3
  }, opts)
  self._availableRetries = self._opts.maxRetries

  var peerId = new Buffer('01234567890123456789'),
    port = 6881,
    data = { announce: self._announce, infoHash: hash }

  self._client = new BittorrentTracker(peerId, port, data)

  self._client.on('error', function () {})
  self._client.on('update', function (res) {
    self._results.push(res)
  })
  self._client.update()

  self._updaterTimeout = function () {
    var results = common.getReliablePeers(self._results)
    clearTimeout(self._timer)
    if ((results == false || self._results.length < Math.min(Math.ceil(self._announce.length / 2), 5)) && self._availableRetries > 0) {
      --self._availableRetries
      self._timer = setTimeout( self._updaterTimeout, self._opts.interval)
    } else {
      if (results != false) {
        results.retries = self._opts.maxRetries - self._availableRetries
        results.responses = self._results.length
        results.announces = self._announce.length
      }
      /*self._client.removeAllListeners('error')
      self._client.removeAllListeners('update')
      self._client = null*/
      cb((results != false) ? null : new Error('No peers found'), (self._opts.getAll) ? self._results : results)
    }
  }

  self._timer = setTimeout( self._updaterTimeout, self._opts.interval)
}
