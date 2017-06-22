'use strict'

const sheetId = '1hquyoD7DBdG_K0FxRy6L6a-ejRgXLRk3fnc5nBGlhzw' // dw-connect translations
const path = require('path')

console.log('this script runs at %s', __dirname)

let exportPath = path.join(__dirname, 'tmp')

const credentials = require('./projects/dw-connect-credentials.json')
const app = require('./index')

app.exportToSpreadsheet(exportPath, sheetId, credentials, function (targetPath, callback) {

  const shell = require('shelljs')
  const withoutError = require('./src/helpers').withoutError

  if (!shell.which('php')) {
    withoutError('Sorry, this script requires php', callback)
  } else {

    shell.exec('php /Users/Andreas/Dropbox/Scripting/WebdevOptimizers/scripts/MergeTranslationFile.php -e zend -xa -f ' + targetPath + ' application/', function (code) {
      // do some output parsing?
      if (code === 0) {
        callback(null, path.join(targetPath, 'ALL-KEYS-EXPORT.csv'))
      } else {
        withoutError('translation parser ran into an error', callback)
      }
    })
  }
}, function (err) {
  if (!err) {
    console.log('Yea! Export is done!')
  } else {
    console.log('Error during export attempt:')
    console.log(err)
  }
})

