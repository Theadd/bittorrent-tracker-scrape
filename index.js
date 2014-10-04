var Scrape = require('./scraper')
var Update = require('./updater')
var Torrent = require('./torrent')

module.exports = ScrapeWorker
module.exports.Scrape = Scrape
module.exports.Update = Update
module.exports.Torrent = Torrent

function ScrapeWorker (hash, announce, opts, callback) {
  announce = announce || []
  opts = opts || {}

  var workerFarm = require('worker-farm')
    , workers    = workerFarm(require.resolve('./torrent'))

  workers(hash, announce, opts, function(err,  res) {
    callback(err, res)
    workerFarm.end(workers)
  })
}
