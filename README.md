# gh-releases-stats

A Node module for analysing GitHub Releases download stats.

[Try it on RunKit](https://npm.runkit.com/gh-releases-stats)

## Installation

`npm i [-g] gh-releases-stats`

## Command line usage

`ghrs <username>/<repo name> [--by-release [--filter=<glob>]|--by-type|--filter=<glob>|--list|--tag=<tagname>] [--mark-prereleases]`

## Programmatic usage

Best demonstrated with a series of examples:

```javascript
const ghrs = require("gh-releases-stats")

let repo = "username/reponame"

ghrs.list(repo, (err, releases) => {
  console.log(releases)
  /* an Array of releases, each with keys:
     url, assetsUrl, uploadUrl, htmlUrl, id, tagName, targetCommitish,
     name, draft, author, prerelease, createdAt, publishedAt, assets,
     tarballUrl, zipballUrl, body */
})

ghrs.dict(repo, (err, releasesDict) => {
  console.log(releasesDict)
  /* an Object with each release's tagName as keys, each with keys as above */
})

ghrs.byType(repo, (err, typesDict) => {
  console.log(typesDict)
  /* an Object with each type's file extension as keys, each with keys downloadCount and releasesCount */
})

ghrs.byRelease(repo, {
  // this object is optional
  filterGlob: "*.deb"
}, (err, releasesDict) => {
  console.log(releasesDict)
  /* an Object with each releases's tagName as keys, each with keys downloadCount and prerelease; asset filenames optionally filtered by filterGlob */
})

ghrs.total(repo, {
  // this object is optional
  filterGlob: "*.+(deb|AppImage)"
}, (err, totalDownloadCount) => {
  console.log(totalDownloadCount)
  /* a Number representing total downloads for all releases and types; asset filenames optionally filtered by filterGlob */
})
```
