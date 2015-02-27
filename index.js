/*
 * bittorrent-workers
 * https://github.com/Theadd/bittorrent-workers
 *
 * Copyright (c) 2015 R.Beltran https://github.com/Theadd
 * Licensed under the MIT license.
 */

var Scrape = require('./scraper')
var Update = require('./updater')
var Torrent = require('./torrent')
var Metadata = require('./metadata')

module.exports = {
  Scraper: ScrapeWorker,
  Leecher: MetadataWorker
}

module.exports.Scraper.Scrape = Scrape
module.exports.Scraper.Update = Update
module.exports.Scraper.Torrent = Torrent
module.exports.Leecher.Leech = Metadata

function ScrapeWorker (hash, announce, opts, callback) {
  announce = announce || []
  opts = opts || {}

  var workerFarm = require('worker-farm')
    , workers    = workerFarm({maxCallTime: opts.maxCallTime || 5000}, require.resolve('./torrent'))

  workers(hash, announce, opts, function(err,  res) {
    callback(err, res)
    workerFarm.end(workers)
  })
}

function MetadataWorker (target, opts, callback) {
  opts = opts || {}

  var workerFarm = require('worker-farm')
    , workers    = workerFarm({maxCallTime: opts.maxCallTime || 90000}, require.resolve('./metadata'))

  workers(target, opts, function(err,  res) {
    callback(err, res)
    workerFarm.end(workers)
  })
}
