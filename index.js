var Scrape = require('./scraper')
var Update = require('./updater')
var Torrent = require('./torrent')
var Metadata = require('./metadata')

module.exports = ScrapeWorker
module.exports.Scrape = Scrape
module.exports.Update = Update
module.exports.Torrent = Torrent
module.exports.Metadata = Metadata

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
