const request = require("request");

const repoRegex = /\S+\/\S+/;

const USER_AGENT = `gh-releases-stats v${require("../package.json").version}`;
const CAMELIFY_TARGET_CHAR = "_";
const COLUMN_PADDING = 1;

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

module.exports.getReleasesInfo = function(repoIdentifier, cb) {
  if (repoIdentifier && module.exports.isValidRepoIdentifier(repoIdentifier)) {
    request({
      url: `https://api.github.com/repos/${repoIdentifier}/releases`,
      headers: {
        "User-Agent": USER_AGENT
      }
    }, (err, response, body) => {
      if (err) {
        cb(err);
      } else {
        let releasesCamelified = [];
        let releases = JSON.parse(body);
        for (let i = 0, l = releases.length; i < l; i++) {
          releasesCamelified.push(module.exports.recursiveCamelify(releases[i]));
        }

        cb(null, releasesCamelified);
      }
    })
  } else {
    cb(new Error("Invalid repository identifier"));
  }
};

module.exports.sum = {};

module.exports.sum.releaseDownloadCounts = function(assets) {
  var sum = 0;
  for (let i = 0, l = assets.length; i < l; i++) {
    sum += assets[i].downloadCount;
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
        map[ext] = 0;
      }
      map[ext] += asset.downloadCount;
    }
  }
  return map;
};

module.exports.sum.totalDownloadCount = function(releases) {
  var sum = 0;
  for (let i = 0, l = releases.length; i < l; i++) {
    for (let j = 0, m = releases[i].assets.length; j < m; j++) {
      sum += releases[i].assets[j].downloadCount;
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
