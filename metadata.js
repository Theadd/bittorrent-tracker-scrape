/**
 * Created by Theadd on 27/02/2015.
 */

var extend = require('node.extend')
var readTorrent = require('read-torrent')
var webTorrent = require('webtorrent')

module.exports = Metadata

function Metadata (target, opts, callback) {
  var self = this
  if (!(self instanceof Metadata)) return new Metadata(target, opts, callback)

  self._parseInput(target)

  self._opts = extend(true, {
    interval: 800,
    sources: {
      "torcache.net": function (info_hash) {
        return "http://torcache.net/torrent/" + info_hash + ".torrent"
      },
      "torrage.com": function (info_hash) {
        return "http://torrage.com/torrent/" + info_hash + ".torrent"
      },
      "zoink.it": function (info_hash) {
        return "http://zoink.it/torrent/" + info_hash + ".torrent"
      },
      "reflektor.karmorra.info": function (info_hash) {
        return "http://reflektor.karmorra.info/torrent/" + info_hash + ".torrent"
      },
      "magnet": function (info_hash) {
        return "magnet:?xt=urn:btih:" + info_hash.toLowerCase()
      }
    },
    priority: [ "torcache.net", "zoink.it", /*"torrage.com", "reflektor.karmorra.info",*/ "magnet" ],
    targetInputFirst: true,
    useSources: true,
    disableMagnet: false
  }, opts || {})

  if (typeof callback === "function") {
    self.request(callback)
  }
}

Metadata.prototype._parseInput = function (input) {
  // http://torrage.com/torrent/948BB2B15ACF6CC55B00BADF0AE171D2A6773605.torrent
  // magnet:?xt=urn:btih:948bb2b15acf6cc55b00badf0ae171d2a6773605&dn=Vikings%20S03E01%20HDTV%20x264-KILLERS...&tr=http%3A%2F%2Ftorrent.gresille.org%2Fannounce&tr=http%3A%2F%2Fwww.eddie4.nl%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.trackerfix.com%2Fannounce&tr=http%3A%2F%2Fbttracker.crunchbanglinux.org%3A6969%2Fannounce&tr=http%3A%2F%2Fmgtracker.org%3A2710%2Fannounce&tr=http%3A%2F%2Fretracker.uln-ix.ru%2Fannounce&tr=http%3A%2F%2Ftracker.best-torrents.net%3A6969%2Fannounce&tr=http%3A%2F%2Fflashtorrents.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.tfile.me%2Fannounce&tr=http%3A%2F%2Ftracker.flashtorrents.org%3A6969%2Fannounce%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BDc%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EF%BF%BD%EE%83%BF&tr=http%3A%2F%2Fannounce.xxx-tracker.com%3A2710%2Fannounce&tr=http%3A%2F%2Fbt.careland.com.cn%3A6969%2Fannounce&tr=http%3A%2F%2Fcastradio.net%3A6969%2Fannounce&tr=http%3A%2F%2Fretracker.adminko.org%2Fannounce&tr=http%3A%2F%2Fretracker.telecom.kz%2Fannounce&tr=http%3A%2F%2Ftracker.flashtorrents.org%3A6969%2Fannounce%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3Fc&tr=http%3A%2F%2Ftracker.flashtorrents.org%3A6969%2Fannounce&tr=http%3A%2F%2Fserver1.9sheng.cn%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker2.wasabii.com.tw%3A6969%2Fannounce
  // 948BB2B15ACF6CC55B00BADF0AE171D2A6773605

  var self = this

  self._info_hash = false
  self._magnet = false
  self._file = false
  self._inputSource = false

  if (input.indexOf(':') != -1) {
    var magnetParts = input.match(/magnet:.*?:btih:([^&]*)&?.*$/)
    if (magnetParts) {
      self._info_hash = magnetParts[1].toUpperCase()
      self._inputSource = "magnet"
      self._magnet = input
    } else {
      var urlParts = input.match(/^http.*?\/\/([^\/]*?)\/.*?([^\/]*)\.torrent/)
      if (urlParts) {
        self._info_hash = urlParts[2].toUpperCase()
        self._inputSource = urlParts[1].toLowerCase()
        self._file = input
      } else {
        throw new Error("Unexpected input format.")
      }
    }
  } else {
    self._info_hash = input.toUpperCase()
  }
}


Metadata.prototype._buildQueue = function () {
  var self = this

  self._queue = []
  if (self._opts.targetInputFirst && self._inputSource != false) {
    self._queue.push({
      "source": self._inputSource,
      "link": (self._magnet == false) ? self._file : self._magnet
    })
  }

  if (self._opts.useSources) {
    for (var i in self._opts.priority) {
      var source = self._opts.priority[i]
      if (self._opts.targetInputFirst && self._inputSource == source) continue
      self._queue.push({
        "source": source,
        "link": self._opts.sources[source](self._info_hash)
      })
    }
  }
}

Metadata.prototype.request = function (callback) {
  var self = this

  self._buildQueue()

  console.log("\n---------------- QUEUE -------------------")
  console.log(JSON.stringify(self._queue, null, "  "))
  console.log("-----------------------------------------\n")

  if (self._queue.length) {
    var item = self._queue.shift()
    self._request(item, callback)
  } else {
    callback({
      "error": new Error ("Queue is empty.")
    })
  }
}

Metadata.prototype._request = function (item, callback) {
  var self = this

  self._get(item, function (err, res) {
    console.log("\n... in callback of _get from _request for " + item.source + ", err:")
    console.log(err)
    if (res) {
      console.log(">>>>> RESULTS FOUND!")
      self.store(item.source, res)
    }
    console.log("   ")
    if (self._queue.length) {
      var nextItem = self._queue.shift()
      self._request(nextItem, callback)
    } else {
      callback(new Error ("Reached end of the queue with no luck."))
    }
  })

}

Metadata.prototype._get = function (item, callback) {
  var self = this

  if (item.source == "magnet") {
    if (!self._opts.disableMagnet) {
      self._getMagnet(item, callback)
    } else {
      return callback(new Error("Magnet links are disabled."))
    }
  } else {
    self._getFile(item, callback)
  }
}

Metadata.prototype._getFile = function (item, callback) {
  readTorrent(item.link, function(err, torrent) {
    if (err) {
      console.log("\n..... ERROR RETRIEVING METADATA FROM " + item.link + "\n")
      return callback(new Error ("Error in " + item.source + "; " + err))
      /*console.log("\n..... ERROR RETRIEVING METADATA FROM " + item.link + "\n")
      if (self._queue.length) {
        var nextItem = self._queue.shift()
        self._request(nextItem, callback)
      } else {
        callback(new Error ("Reached end of the queue with no luck."))
      }*/
    } else {
      //self.store(item.source, torrent)

      /*if (self._queue.length) {
        var nextItem2 = self._queue.shift()
        self._request(nextItem2, callback)
      } else {
        callback(new Error ("Reached end of the queue with no luck."))
      }*/
      return callback(null, {
       "source": item.source,
       "link": item.link,
       "data": torrent
      })
    }
    console.log("+++++++++++++++++++++++++++++++++++")
  })
}

Metadata.prototype._getMagnet = function (item, callback) {
  var self = this,
    client = new webTorrent()

  client.add(item.link, function (torrent) {
    // Got torrent metadata!
    console.log("\n========= WebTorrent ===========")
    console.log('Torrent info hash:', torrent.infoHash)
    //console.log(torrent)
    self.store(item.source, torrent.parsedTorrent)
    return client.destroy(function () {
      return callback(null, {
        "source": item.source,
        "link": item.link,
        "data": torrent.parsedTorrent
      })
    })

  })
}


Metadata.prototype.store = function (source, torrent) {
  var fs = require('fs')
  fs.writeFileSync("./data/" + source + ".json", JSON.stringify(torrent, null, "  "))
}
