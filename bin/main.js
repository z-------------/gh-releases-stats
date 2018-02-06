#!/usr/bin/env node

/* require modules, initialize consts */

const request = require("request");
const minimist = require("minimist");
const package = require("../package.json");

const USAGE_STRING = "Usage: ghrs <username>/<repo name> [--by-type|--by-release]";
const USER_AGENT = `gh-releases-stats v${package.version}`;

const repoRegex = /\S+\/\S+/;

const zpadString = function(string, n) {
  n = n || 4;
  var chars = string.split("");
  while (chars.length % n !== 0) {
    chars.unshift(" ");
  }
  return chars.join("");
};

const getFileExtension = function(filename) {
  let filenameSplit = filename.split(".");
  return filenameSplit[filenameSplit.length - 1];
};

const sumReleaseDownloadCounts = function(assets) {
  var sum = 0;
  for (let i = 0, l = assets.length; i < l; i++) {
    sum += assets[i].download_count;
  }
  return sum;
};

const sumAssetTypeDownloadCounts = function(releases) {
  var map = {};
  for (let i = 0, l = releases.length; i < l; i++) {
    for (let j = 0, m = releases[i].assets.length; j < m; j++) {
      let asset = releases[i].assets[j];
      let ext = getFileExtension(asset.name);
      if (!map.hasOwnProperty(ext)) {
        map[ext] = 0;
      }
      map[ext] += asset.download_count;
    }
  }
  return map;
};

const sumTotalDownloadCount = function(releases) {
  var sum = 0;
  for (let i = 0, l = releases.length; i < l; i++) {
    for (let j = 0, m = releases[i].assets.length; j < m; j++) {
      sum += releases[i].assets[j].download_count;
    }
  }
  return sum;
};

/* parse arguments */

let args = minimist(process.argv.slice(2));

let repo = args._[0];

/* moving parts */

if (args["version"] || args["v"]) {
  console.log(`gh-release-stats v${package.version}`);
} else if (args["help"] || args["h"]) {
  console.log("\n" + USAGE_STRING + "\n");
} else if (repo && repoRegex.test(repo)) {
  request({
    url: `https://api.github.com/repos/${repo}/releases`,
    headers: {
      "User-Agent": USER_AGENT
    }
  }, (err, response, body) => {
    if (err) throw err;
    let releases = JSON.parse(body);
    if (args["by-type"]) {
      let map = sumAssetTypeDownloadCounts(releases);
      let exts = Object.keys(map).sort(function(a, b) {
        if (map[a] > map[b]) return -1;
        if (map[a] < map[b]) return 1;
        return 0;
      });

      console.log("");
      for (let i = 0, l = exts.length; i < l; i++) {
        console.log(`${zpadString(exts[i], 8)} : ${zpadString(map[exts[i]].toString(), 5)} downloads`);
      }
      console.log("");
    } else if (args["by-release"]) {
      console.log("");
      for (let i = 0, l = releases.length; i < l; i++) {
        let releaseNameStr = zpadString(releases[i].name, 16);
        let totalDownloadCount = sumReleaseDownloadCounts(releases[i].assets);
        let totalDownloadCountStr = zpadString(totalDownloadCount.toString(), 5);
        let isPrereleaseStr = releases[i].prerelease ? " (pre-release)" : "";
        console.log(`${releaseNameStr} : ${totalDownloadCountStr} downloads${isPrereleaseStr}`);
      }
      console.log("");
    } else {
      console.log(`\n${sumTotalDownloadCount(releases)} total downloads\n`);
    }
  });
} else {
  console.log("\nNo valid repository name provided.\n" + USAGE_STRING + "\n");
}
