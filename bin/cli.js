#!/usr/bin/env node

/* require modules, initialize consts */

const minimist = require("minimist");
const utils = require("../lib/utils.js");
const ghrs = require("../lib/main.js");

const USAGE_STRING = "Usage: ghrs <username>/<repo name> [--by-release [--filter=<glob>]|--by-type|--filter=<glob>|--list|--tag=<tagname>] [--mark-prereleases]";

/* parse arguments */

let args = minimist(process.argv.slice(2));

let repo = args._[0];

/* moving parts */

if (args["version"] || args["v"]) {
  console.log(`gh-release-stats v${require("../package.json").version}`);
} else if (args["help"] || args["h"]) {
  console.log("\n" + USAGE_STRING + "\n");
} else if (repo && utils.isValidRepoIdentifier(repo)) {
  if (typeof args.tag === "string") {
    ghrs.dict(repo, (err, releases) => {
      if (err) throw err;
      if (releases.hasOwnProperty(args.tag)) {
        let release = releases[args.tag];

        let totalDownloadCount = utils.sum.releaseDownloadCount(release.assets);

        let assetsSorted = release.assets.sort(function(a, b) {
          if (a.downloadCount > b.downloadCount) return -1;
          if (a.downloadCount < b.downloadCount) return 1;
          return 0;
        });
        let columnType = [];
        let columnDownloadCount = [];
        for (let i = 0, l = assetsSorted.length; i < l; i++) {
          let ext = utils.getFileExtension(assetsSorted[i].name);
          let extIndex = columnType.indexOf(ext);
          if (extIndex === -1) {
            columnType.push(ext);
            columnDownloadCount.push(assetsSorted[i].downloadCount);
          } else {
            columnDownloadCount[extIndex] += assetsSorted[i].downloadCount;
          }
        }

        console.log(`\n${totalDownloadCount} downloads of release '${args.tag}'${release.prerelease ? " (pre-release)" : ""}\n`)
        console.log(utils.columnFormat([columnType, columnDownloadCount]));
        console.log("");
      } else {
        console.log(`\nRelease with tag name '${args["tag"]}' not found. See existing releases using \`ghrs ${repo} --list\`.\n`);
      }
    });
  } else if (args.list) {
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
    var glob = "*";
    if (args["filter"]) {
      glob = args["filter"];
      console.log("Filtering by glob " + glob);
    }
    ghrs.byRelease(repo, {
      filterGlob: glob
    }, (err, releases) => {
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
    var glob = "*";
    if (args["filter"]) {
      glob = args["filter"];
      console.log("Filtering by glob " + glob);
    }
    ghrs.total(repo, {
      filterGlob: glob
    }, (err, total) => {
      console.log(`\n${total}\n`);
    });
  }
} else {
  console.log("\nInvalid repository identifier.\n" + USAGE_STRING + "\n");
}
