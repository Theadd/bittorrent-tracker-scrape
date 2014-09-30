/**
 * Created by Theadd on 30/09/2014.
 */

var extend = require('util')._extend
var BittorrentTracker = require('bittorrent-tracker')
var common = require('./lib/common')

module.exports = Scraper

function Scraper (hash, announce, opts, cb) {
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

  self._announce.forEach(function (url) {
    BittorrentTracker.scrape(url, self._hash, function(err, res) {
      if (!err) {
        self._results.push(res)
      }
    })
  })

  self._scraperTimeout = function () {
    var results = common.getReliablePeers(self._results)
    clearTimeout(self._timer)
    if ((results == false || self._results.length < Math.min(Math.ceil(self._announce.length / 2), 5)) && self._availableRetries > 0) {
      --self._availableRetries
      self._timer = setTimeout( self._scraperTimeout, self._opts.interval)
    } else {
      if (results != false) {
        results.retries = self._opts.maxRetries - self._availableRetries
        results.responses = self._results.length
        results.announces = self._announce.length
      }
      cb((results != false) ? null : new Error('No peers found'), (self._opts.getAll) ? self._results : results)
    }
  }

  self._timer = setTimeout( self._scraperTimeout, self._opts.interval)
}
