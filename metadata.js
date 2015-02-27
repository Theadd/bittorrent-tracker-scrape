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
    priority: [ "torcache.net", "zoink.it", /*"torrage.com",*/ "reflektor.karmorra.info", "magnet" ],
    targetInputFirst: true,
    useSources: true,
    disableMagnet: false,
    outputAsList: false
  }, opts || {})

  if (typeof callback === "function") {
    self.request(callback)
  }
}

Metadata.prototype._parseInput = function (input) {
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

  if (self._queue.length) {
    var item = self._queue.shift(),
      list = []

    self._request(item, list, callback)
  } else {
    return callback(new Error ("Queue is empty."))
  }
}

Metadata.prototype._request = function (item, list, callback) {
  var self = this

  self._get(item, function (err, res) {
    if (res) {
      if (!self._opts.outputAsList) {
        return callback(null, res)
      } else {
        list.push(res)
      }
    } else {
      if (self._opts.outputAsList) {
        list.push({
          "source": item.source,
          "link": item.link,
          "error": err
        })
      }
    }
    if (self._queue.length) {
      var nextItem = self._queue.shift()
      self._request(nextItem, list, callback)
    } else {
      if (!self._opts.outputAsList) {
        return callback(new Error ("Invalid response from sources."))
      } else {
        return callback(null, list)
      }
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
      return callback(new Error ("Error in " + item.source + ": " + err))
    } else {
      return callback(null, {
       "source": item.source,
       "link": item.link,
       "data": torrent
      })
    }
  })
}

Metadata.prototype._getMagnet = function (item, callback) {
  var client = new webTorrent()

  client.add(item.link, function (torrent) {
    return client.destroy(function () {
      return callback(null, {
        "source": item.source,
        "link": item.link,
        "data": torrent.parsedTorrent
      })
    })
  })
}
