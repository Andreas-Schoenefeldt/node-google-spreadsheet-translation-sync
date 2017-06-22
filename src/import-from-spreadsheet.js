'use strict'

module.exports = function (localPath, sheetId, credentials, callback) {

  const connector = require('./connector')
  const withoutError = require('./helpers').withoutError

  connector(sheetId, credentials, function (err, sheet) {

    if (withoutError(err, callback)) {

      /** @var {SpreadsheetWorksheet} sheet */
      sheet.getCells({
        'min-row': 1,
        'max-row': sheet.rowCount,
        'return-empty': false
      }, function (err, cells) {
        if (withoutError(err, callback)) {

          let csvData = []

          cells.forEach(function (cell) {
            let rowIndex = cell.row - 1
            let cellIndex = cell.col - 1

            if (!csvData[rowIndex]) {
              csvData[rowIndex] = []
            }

            csvData[rowIndex][cellIndex] = cell.value.trim()
          })

          const csv = require('fast-csv')
          const path = require('path')

          const importFile = path.join(localPath, 'import.csv')

          csv.writeToPath(
            importFile, csvData, {headers: true}
          ).on('finish', function (err) {
            if (withoutError(err, callback)) {
              console.log('done Writing import csv!')

              const shell = require('shelljs')
              shell.exec('php /Users/Andreas/Dropbox/Scripting/WebdevOptimizers/scripts/MergeTranslationFile.php -e zend -force -f ' + importFile + ' application/', function (code, stdout, stderr) {
                callback()
              })
            }
          })

        }
      })
    }
  })

}
