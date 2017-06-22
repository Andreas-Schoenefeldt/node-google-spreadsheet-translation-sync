'use strict'
/**
 * Created by Andreas on 22/06/17.
 */

/**
 * @param {string} localPath the path where to export the translations locally, before uploading
 * @param sheetId the google spreadsheet id
 * @param credentials the google json credentials
 * @param {function} callback
 */
module.exports = function (localPath, sheetId, credentials, csvGetter, callback) {

  const mkdirp = require('mkdirp')

  mkdirp(localPath, function (err) {

    const withoutError = require('./helpers').withoutError

    if (withoutError(err, callback)) {

      csvGetter(localPath, function (err, csvPath) {
        if (withoutError(err)) {

          const csv = require('fast-csv')
          const fs = require('fs')
          const connector = require('./connector')

          if (fs.existsSync(csvPath)) {

            let csvData = []
            let header = {}
            let currentLine = 0
            let cellsPerRow

            let stream = fs.createReadStream(csvPath)

            console.log('start to read csv ' + csvPath)

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
                connector(sheetId, credentials, function (err, sheet) {

                  if (withoutError(err, callback)) {

                    sheet.getCells({
                      'min-row': 1,
                      'max-row': csvData.length + 1, // because row index is 1 based
                      'min-col': 1,
                      'max-col': sheet.colCount,
                      'return-empty': true
                    }, function (err, cells) {

                      if (withoutError(err, callback)) {

                        let changedCells = []
                        let headerIndexMap = {}
                        let maxIndex = 0

                        cells.forEach(function (cell) {

                          if (cell.row === 1) {
                            // this is the header row
                            if (cell.value) {
                              headerIndexMap[cell.col] = header[cell.value]
                              maxIndex = cell.col
                            }
                          } else if (cell.col <= maxIndex) {

                            // now we work with the actual data
                            // console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value)
                            let expectedValue = csvData[cell.row - 2][headerIndexMap[cell.col]]

                            // we only override the spreadsheet from the code, if we actually have a value
                            if (expectedValue && cell.value !== expectedValue) {
                              cell.value = expectedValue
                              changedCells.push(cell)
                            }
                          }

                        })

                        if (changedCells.length > 0) {

                          console.log('Updating %s changed cells', changedCells.length)

                          sheet.bulkUpdateCells(changedCells, function (err) {
                            if (withoutError(err, callback)) {
                              console.log('SUCCESS: Data was updated')
                              callback(null)
                            }
                          })

                        } else {
                          console.log('Nothing changed since the last run')
                          callback(null)
                        }
                      }
                    })
                  }
                })

              })
          } else {
            withoutError('File does not exist: ' + csvPath, callback)
          }

        }
      })
    }

  })

}
