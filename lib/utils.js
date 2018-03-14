const request = require("request");
const minimatch = require("minimatch");
const URL = require("url").URL;

const repoRegex = /\S+\/\S+/;

const USER_AGENT = `gh-releases-stats v${require("../package.json").version}`;
const CAMELIFY_TARGET_CHAR = "_";
const COLUMN_PADDING = 1;

let releasesInfoCache = {};

module.exports.zpadString = function(input, n) {
  n = n || 4;
  var chars = input.toString().split("");
  while (chars.length % n !== 0) {
    chars.unshift(" ");
  }
  return chars.join("");
};

module.exports.getFileExtension = function(filename) {
  let filenameSplit = filename.split(".");
  return filenameSplit[filenameSplit.length - 1];
};

module.exports.camelify = function(input) {
  if (typeof input === "number") {
    return input;
  } else {
    var chars = input.toString().split("");
    while (chars.indexOf(CAMELIFY_TARGET_CHAR) !== -1) {
      let index = chars.indexOf(CAMELIFY_TARGET_CHAR);
      chars.splice(index, 1);
      chars[index] = chars[index].toUpperCase(); // the char following the CAMELIFY_TARGET_CHAR
    }
    return chars.join("");
  }
};

module.exports.recursiveCamelify = function(originalObject) {
  if (Array.isArray(originalObject)) {
    let output = [];
    for (let i = 0, l = originalObject.length; i < l; i++) {
      output[i] = module.exports.recursiveCamelify(originalObject[i]);
    }
    return output;
  } else if (originalObject !== null && typeof originalObject !== "undefined") {
    let output = {};
    let originalKeys = Object.keys(originalObject);
    for (let i = 0, l = originalKeys.length; i < l; i++) {
      let newKey = module.exports.camelify(originalKeys[i]);
      if (typeof originalObject[originalKeys[i]] === "object") {
        output[newKey] = module.exports.recursiveCamelify(originalObject[originalKeys[i]]);
      } else {
        output[newKey] = originalObject[originalKeys[i]];
      }
    }
    return output;
  }
  return null
};

module.exports.isValidRepoIdentifier = function(repoIdentifier) {
  return repoRegex.test(repoIdentifier);
};

function parseResponseLinkHeader(linkHeader) {
  if (linkHeader) {
    let array = linkHeader.split(", ");
    let result = {};
    for (let i = 0; i <= 1; i++) {
      let split = array[i].split("; ");
      let linkUrl = new URL(split[0].substring(1, split[0].length - 1));
      let linkRel = split[1].substring(split[1].indexOf("=") + 2, split[1].length - 1);
      let pageNum = Number(linkUrl.search.substring(linkUrl.search.indexOf("=") + 1));
      result[linkRel] = pageNum;
    }
    return result;
  }
  return {};
};

let getReleasesRecursive = function(repoIdentifier, pageNum, cb) {
  let releases = [];

  request({
    url: `https://api.github.com/repos/${repoIdentifier}/releases?per_page=100&page=${pageNum}`,
    headers: {
      "User-Agent": USER_AGENT
    }
  }, (err, response, body) => {
    if (err) {
      cb(err);
    } else {
      let pageReleases = JSON.parse(body);
      for (let i = 0, l = pageReleases.length; i < l; i++) {
        releases.push(module.exports.recursiveCamelify(pageReleases[i]));
      }

      let linkHeaderParsed = parseResponseLinkHeader(response.headers.link);
      if (!linkHeaderParsed.hasOwnProperty("next")) {
        cb(null, releases);
      } else {
        getReleasesRecursive(repoIdentifier, linkHeaderParsed.next, (err, res) => {
          if (err) {
            cb(err);
          } else {
            releases.push(...res);
            cb(null, releases);
          }
        });
      }
    }
  });
};

module.exports.getReleasesInfo = function(repoIdentifier, cb) {
  if (repoIdentifier && module.exports.isValidRepoIdentifier(repoIdentifier)) {
    if (releasesInfoCache.hasOwnProperty(repoIdentifier)) {
      cb(null, releasesInfoCache[repoIdentifier]);
    } else {
      getReleasesRecursive(repoIdentifier, 1, (err, releases) => {
        if (err) {
          cb(new Error("Error getting releases"));
        } else {
          releasesInfoCache[repoIdentifier] = releases;
          cb(null, releases);
        }
      });
    }
  } else {
    cb(new Error("Invalid repository identifier"));
  }
};

module.exports.sum = {};

module.exports.sum.releaseDownloadCount = function(assets, options) {
  var sum = 0;

  var glob = "*";
  if (options && options.filterGlob) {
    glob = options.filterGlob;
  }

  for (let i = 0, l = assets.length; i < l; i++) {
    if (minimatch(assets[i].name, glob)) {
      sum += assets[i].downloadCount;
    }
  }
  return sum;
};

module.exports.sum.assetTypeDownloadCounts = function(releases) {
  var map = {};
  for (let i = 0, l = releases.length; i < l; i++) {
    for (let j = 0, m = releases[i].assets.length; j < m; j++) {
      let asset = releases[i].assets[j];
      let ext = module.exports.getFileExtension(asset.name);
      if (!map.hasOwnProperty(ext)) {
        map[ext] = {
          downloadCount: 0,
          releasesCount: 0
        };
      }
      map[ext].downloadCount += asset.downloadCount;
      map[ext].releasesCount += 1;
    }
  }
  return map;
};

module.exports.sum.totalDownloadCount = function(releases, options) {
  var sum = 0;

  var glob = "*";
  if (options && options.filterGlob) {
    glob = options.filterGlob;
  }

  for (let i = 0, l = releases.length; i < l; i++) {
    for (let j = 0, m = releases[i].assets.length; j < m; j++) {
      if (minimatch(releases[i].assets[j].name, glob)) {
        sum += releases[i].assets[j].downloadCount;
      }
    }
  }
  return sum;
};

module.exports.columnFormat = function(columns) {
  /* determine height of our "table" */
  let height = Math.max(...columns.map(function(column) {
    return column.length;
  }));

  /* determine width of each column */
  let columnWidths = Array.apply(null, Array(columns.length)).map(Number.prototype.valueOf, 0); // https://stackoverflow.com/a/13735425
  for (let i = 0, l = columns.length; i < l; i++) {
    for (let j = 0, m = columns[i].length; j < m; j++) {
      if (columns[i][j].length > columnWidths[i]) {
        columnWidths[i] = columns[i][j].length;
      }
    }
  }

  /* format */
  var formatted = "";
  let padding = Array(COLUMN_PADDING + 1).join(" ");
  for (let i = 0; i < height; i++) {
    for (let j = 0, m = columns.length; j < m; j++) {
      formatted += padding + module.exports.zpadString(columns[j][i], columnWidths[j]) + padding;
    }
    formatted += "\n";
  }

  return formatted;
};
