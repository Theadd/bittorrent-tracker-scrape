var Scrape = require('./scraper')
var Update = require('./updater')
var Torrent = require('./torrent')

var workerFarm = require('worker-farm')
  , workers    = workerFarm(require.resolve('./torrent'))

module.exports = ScrapeWorker
module.exports.Scrape = Scrape
module.exports.Update = Update
module.exports.Torrent = Torrent

function ScrapeWorker (hash, announce, opts, callback) {
  announce = announce || []
  opts = opts || {}

  workers(hash, announce, opts, function(err,  res) {
    callback(err, res)
    workerFarm.end(workers)
  })
}
