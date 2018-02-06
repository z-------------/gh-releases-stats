#!/usr/bin/env node

/* require modules, initialize consts */

const request = require("request");
const package = require("../package.json");

const USAGE_STRING = "Usage: ghrs <username>/<repo name>";
const USER_AGENT = `gh-releases-stats v${package.version}`;

const repoRegex = /\S+\/\S+/;

const sumDownloadCounts = function(assets) {
  var sum = 0;
  for (let i = 0, l = assets.length; i < l; i++) {
    sum += assets[i].download_count;
  }
  return sum;
};

const zpadString = function(string, n) {
  n = n || 4;
  var chars = string.split("");
  while (chars.length % n !== 0) {
    chars.unshift(" ");
  }
  return chars.join("");
};

/* parse arguments */

let repo = process.argv[2];

/* moving parts */

if (repo && repoRegex.test(repo)) {
  request({
    url: `https://api.github.com/repos/${repo}/releases`,
    headers: {
      "User-Agent": USER_AGENT
    }
  }, (err, response, body) => {
    if (err) throw err;
    let releases = JSON.parse(body);
    for (let i = 0, l = releases.length; i < l; i++) {
      let totalDownloadCount = sumDownloadCounts(releases[i].assets);
      let releaseNameStr = zpadString(releases[i].name, 16);
      let totalDownloadCountStr = zpadString(totalDownloadCount.toString(), 5);
      let isPrereleaseStr = releases[i].prerelease ? " (pre-release)" : "";
      console.log(`${releaseNameStr} : ${totalDownloadCountStr}${isPrereleaseStr}`);
    }
  });
} else {
  console.log("No valid repository name provided.\n" + USAGE_STRING);
}
