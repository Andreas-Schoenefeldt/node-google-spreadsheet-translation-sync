'use strict'
/**
 * Created by Andreas on 22/06/17.
 */

/**
 * @param {[]} translationFiles - an array of files
 * @param {{translationFormat: string, mode: string, spreadsheetId: string, credentials: {}, keyId: string, fileBaseName: string}} options
 * @param {function} callback
 */
module.exports = function (translationFiles, options, callback) {

  const path = require("path");
  const async = require('async')

  const sheetId = options.spreadsheetId;
  const credentials = options.credentials;
  const translationFormat = options.translationFormat;

  // get the handler
  const h = require('./handler');
  const TRANSLATION_FORMATS = require('./util/constraints').TRANSLATION_FORMATS
  const handler = h.getHandler(translationFormat ? translationFormat : TRANSLATION_FORMATS.LOCALE_JSON );

  // parse the data

  const dataHeaderIndexMap = {};
  const keyIndexMap = {};
  keyIndexMap[options.keyId] = 0;

  const header =  [options.keyId];
  const data = [];

  async.each(translationFiles, function (file, cb) {

    // get the locale

    const extension = path.extname(file);
    const fileName = path.basename(file, extension);
    const localeKey = fileName.substr(options.fileBaseName.length);

    header.push(localeKey);
    keyIndexMap[localeKey] = header.length - 1;

    handler.getTranslationKeys(file, function (tData) {
      // data is a key value

      Object.keys(tData).forEach(function (key) {
        if (typeof (dataHeaderIndexMap[key]) === 'undefined') {
          data.push([key]);
          dataHeaderIndexMap[key] = data.length - 1
        }

        data[dataHeaderIndexMap[key]][keyIndexMap[localeKey]] = tData[key];

      });

      cb();
    })
  }, function (err) {
    const withoutError = require('./helpers').withoutError

    if (withoutError(err, callback)) {
      const connector = require('./connector')
      console.log('data read done - start uploading')

      // let's sort the csvData before we upload
      data.sort(function (a, b) {
        a = a[0].toLocaleLowerCase()
        b = b[0].toLocaleLowerCase()

        return a === b ? 0 : (a < b ? -1 : 1)
      })

      data.unshift(header);

      // upload to google
      connector(sheetId, credentials, function (err, sheet) {

        if (withoutError(err, callback)) {

          sheet.getCells({
            'min-row': 1,
            'max-row': data.length, // because row index is 1 based
            'min-col': 1,
            'max-col': sheet.colCount,
            'return-empty': true
          }, function (err, cells) {

            if (withoutError(err, callback)) {

              let changedCells = [];
              let headerIndexMap = {};
              let maxIndex = 0;

              cells.forEach(function (cell) {

                if (cell.row === 1) {
                  // this is the header row
                  if (cell.value) {
                    headerIndexMap[cell.col] = keyIndexMap[cell.value]
                    maxIndex = cell.col
                  }
                } else if (cell.col <= maxIndex) {

                  // now we work with the actual data
                  // console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value)
                  let expectedValue = headerIndexMap[cell.col] !== undefined ? data[cell.row - 1][headerIndexMap[cell.col]] : null

                  // we only override the spreadsheet from the code, if we actually have a value
                  if (expectedValue !== null && expectedValue !== undefined && cell.value !== expectedValue) {
                    // console.log('Update Cell R' + cell.row + 'C' + cell.col + ' from ' + cell.value + ' to ' + expectedValue);

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
    }
  });


}
