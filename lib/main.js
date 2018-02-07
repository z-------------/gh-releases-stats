const utils = require("./utils.js");

module.exports.list = function(repo, cb) {
  utils.getReleasesInfo(repo, function(err, releases) {
    if (err) {
      cb(err);
    } else {
      cb(null, releases);
    }
  });
};

module.exports.dict = function(repo, cb) {
  utils.getReleasesInfo(repo, function(err, releases) {
    if (err) {
      cb(err);
    } else {
      let dict = {};
      for (let i = 0, l = releases.length; i < l; i++) {
        dict[releases[i].tagName] = releases[i];
      }
      cb(null, dict);
    }
  });
};

module.exports.byType = function(repo, cb) {
  utils.getReleasesInfo(repo, function(err, releases) {
    if (err) {
      cb(err);
    } else {
      let map = utils.sum.assetTypeDownloadCounts(releases);
      let exts = Object.keys(map).sort(function(a, b) {
        if (map[a] > map[b]) return -1;
        if (map[a] < map[b]) return 1;
        return 0;
      });
      cb(null, map);
    }
  });
};

module.exports.byRelease = function(repo, cb) {
  module.exports.list(repo, function(err, releases) {
    if (err) {
      cb(err);
    } else {
      let result = {};
      for (let i = 0, l = releases.length; i < l; i++) {
        result[releases[i].tagName] = {
          downloadCount: utils.sum.releaseDownloadCount(releases[i].assets),
          prerelease: releases[i].prerelease
        };
      }
      cb(null, result);
    }
  });
};

module.exports.total = function(repo, cb) {
  utils.getReleasesInfo(repo, function(err, releases) {
    if (err) {
      cb(err);
    } else {
      cb(err, utils.sum.totalDownloadCount(releases));
    }
  });
};
