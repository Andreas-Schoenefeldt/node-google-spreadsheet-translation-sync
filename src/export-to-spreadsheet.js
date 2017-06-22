'use strict'
/**
 * Created by Andreas on 22/06/17.
 */

/**
 * @param {string} localPath the path where to export the translations locally, before uploading
 * @param sheetId the google spreadsheet id
 * @param credentials the google json credentials
 */
module.exports = function (localPath, sheetId, credentials) {

  const mkdirp = require('mkdirp')

  mkdirp(localPath, function (err) {

    const shell = require('shelljs')

    if (!err) {
      if (!shell.which('php')) {
        shell.echo('Sorry, this script requires php')
        shell.exit(1)
      } else {

        let result = shell.exec('php /Users/Andreas/Dropbox/Scripting/WebdevOptimizers/scripts/MergeTranslationFile.php -e zend -xa -f ' + localPath + ' application/')

        // do some output parsing?

        if (result.code === 0) {

          const csv = require('fast-csv')
          const fs = require('fs')
          const path = require('path')
          const connector = require('./connector')

          let csvPath = path.join(localPath, 'ALL-KEYS-EXPORT.csv')

          if (fs.existsSync(csvPath)) {

            let csvData = []
            let header = {}
            let currentLine = 0
            let cellsPerRow

            let stream = fs.createReadStream(csvPath)

            csv.fromStream(stream)
              .on('data', function (data) {
                if (currentLine === 0) {
                  cellsPerRow = data.length

                  data.forEach(function (item, index) {
                    header[item] = index
                  })
                } else if (data[0]) {

                  // this is nessessary, because google row read stops, if a row is completly empty
                  csvData.push(data)
                }

                currentLine++
              })
              .on('end', function () {
                console.log('CSV done - start uploading')

                // let's sort the csvData before we upload
                csvData.sort(function (a, b) {
                  a = a[0].toLocaleLowerCase()
                  b = b[0].toLocaleLowerCase()

                  return a === b ? 0 : (a < b ? -1 : 1)
                })

                // upload to google
                connector(sheetId, credentials, function (sheet) {

                  sheet.getCells({
                    'min-row': 1,
                    'max-row': csvData.length + 1, // because row index is 1 based
                    'min-col': 1,
                    'max-col': cellsPerRow,
                    'return-empty': true
                  }, function (err, cells) {

                    if (!err) {

                      let changedCells = []
                      let headerIndexMap = {}

                      cells.forEach(function (cell) {

                        if (cell.col < cellsPerRow) {

                          if (cell.row === 1) {
                            // this is the header row
                            if (cell.value) {
                              headerIndexMap[cell.col] = header[cell.value]
                            }
                          } else {

                            // now we work with the actual data
                            // console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value)
                            let expectedValue = csvData[cell.row - 2][headerIndexMap[cell.col]]

                            // we only override the spreadsheet from the code, if we actually have a value
                            if (expectedValue && cell.value !== expectedValue) {
                              cell.value = expectedValue
                              changedCells.push(cell)
                            }
                          }
                        }
                      })

                      if (changedCells.length > 0) {

                        console.log('Updating %s changed cells', changedCells.length)

                        sheet.bulkUpdateCells(changedCells, function (err) {
                          if (!err) {
                            console.log('SUCCESS: Data was updated')
                          } else {
                            console.log('Error: Could not update cells:  %s', err)
                          }
                        })

                      } else {
                        console.log('Nothing changed since the last run')
                      }

                    } else {
                      console.log('Error: Could not get Cells:  %s', err)
                    }
                  })

                  /*

                   sheet.getRows({
                   offset: 0,
                   limit: csvData.length
                   }, function (err, rows) {

                   if (!err) {

                   let addRow = function (i) {
                   if (i < csvData.length) {

                   console.log('Adding row %s (%s)', i + 2, csvData[i][header.key])

                   let row = {}
                   for (let name in header) {
                   row[name] = csvData[i][header[name]]
                   }

                   sheet.addRow(row, function (err) {
                   if (err) {
                   console.error('could not create row %s: %s', i + 2, err)
                   }

                   addRow(i + 1)
                   })
                   }
                   }

                   console.log('Read ' + rows.length + ' rows of ' + csvData.length)
                   let i = 0

                   for (i; i < rows.length; i++) {

                   let row = rows[0]

                   console.log(csvData[i])
                   console.log(row)
                   throw new Exception('stop')

                   for (let name in header) {
                   row[name] = csvData[i][header[name]]
                   }
                   row.save(function (err) {
                   if (err) {
                   console.error('could not save row %s: %s', i + 2, err)
                   }
                   })
                   }

                   addRow(i)

                   /*
                   throw 'stop'

                   // the row is an object with keys set by the column headers
                   rows[0].colname = 'new val'
                   rows[0].save() // this is async

                   // deleting a row
                   rows[0].del()  // this is async

                   }
                   })
                   */

                })

              })
          } else {
            console.log('Error: File does not exist:  %s', csvPath)
          }

        } else {
          console.log('Error %o', result)
        }

      }

    } else {
      console.error(err)
    }

  })

}
