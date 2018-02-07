#!/usr/bin/env node

/* require modules, initialize consts */

const minimist = require("minimist");
const utils = require("../lib/utils.js");
const ghrs = require("../lib/main.js");

const USAGE_STRING = "Usage: ghrs <username>/<repo name> [--by-type|--by-release|--list] [--mark-prereleases]";

/* parse arguments */

let args = minimist(process.argv.slice(2));

let repo = args._[0];

/* moving parts */

if (args["version"] || args["v"]) {
  console.log(`gh-release-stats v${require("../package.json").version}`);
} else if (args["help"] || args["h"]) {
  console.log("\n" + USAGE_STRING + "\n");
} else if (repo && utils.isValidRepoIdentifier(repo)) {
  if (args["list"]) {
    ghrs.list(repo, (err, releases) => {
      if (err) throw err;

      let columnTagName = [];
      let columnIsPrerelease = [];

      for (let i = 0, l = releases.length; i < l; i++) {
        columnTagName.push(releases[i].tagName);
        columnIsPrerelease.push(releases[i].prerelease ? "(pre-release)" : "");
      }

      console.log("");
      if (args["mark-prereleases"]) {
        console.log(utils.columnFormat([columnTagName, columnIsPrerelease]));
      } else {
        console.log(utils.columnFormat([columnTagName]));
      }
      console.log("");
    });
  } else if (args["by-type"]) {
    ghrs.byType(repo, (err, map) => {
      if (err) throw err;

      let types = Object.keys(map);

      let columnType = [];
      let columnDownloadCount = [];

      for (let i = 0, l = types.length; i < l; i++) {
        columnType.push(types[i]);
        columnDownloadCount.push(map[types[i]].downloadCount);
      }

      console.log("");
      console.log(utils.columnFormat([columnType, columnDownloadCount]));
      console.log("");
    });
  } else if (args["by-release"]) {
    ghrs.byRelease(repo, (err, releases) => {
      if (err) throw err;

      let columnTagName = Object.keys(releases);
      let columnDownloadCount = [];
      let columnIsPrerelease = [];

      for (let i = 0, l = columnTagName.length; i < l; i++) {
        let releaseInfo = releases[columnTagName[i]];
        columnDownloadCount.push(releaseInfo.downloadCount);
        columnIsPrerelease.push(releaseInfo.prerelease ? "(pre-release)" : "");
      }

      console.log("");
      if (args["mark-prereleases"]) {
        console.log(utils.columnFormat([columnTagName, columnDownloadCount, columnIsPrerelease]));
      } else {
        console.log(utils.columnFormat([columnTagName, columnDownloadCount]));
      }
      console.log("");
    });
  } else {
    ghrs.total(repo, (err, total) => {
      console.log(`\n${total} total downloads\n`);
    });
  }
} else {
  console.log("\nInvalid repository identifier.\n" + USAGE_STRING + "\n");
}

// ${zpadString(exts[i], 8)} : ${zpadString(map[exts[i]].toString(), 5)} downloads
// ${releaseNameStr} : ${totalDownloadCountStr} downloads${isPrereleaseStr}
// ${sumTotalDownloadCount(releases)} total downloads
