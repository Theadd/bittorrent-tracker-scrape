/**
 * Created by Theadd on 30/09/2014.
 */

var extend = require('util')._extend

exports.getReliablePeers = function (results) {
  var peers, index = -1

  for (var i in results) {
    if (index == -1) {
      peers = extend({}, results[i])
      index = i
      continue
    }
    if (results[i].complete > peers.complete) {
      peers = extend({}, results[i])
      index = i
    } else {
      if (results[i].complete == peers.complete) {
        var field = (typeof results[i].downloaded !== "undefined") ? "downloaded" : "incomplete"
        if (results[i][field] > peers[field]) {
          peers = extend({}, results[i])
          index = i
        }
      }
    }
  }

  return (index != -1) ? peers : false
}
