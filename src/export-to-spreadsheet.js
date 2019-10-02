'use strict'
/**
 * Created by Andreas on 22/06/17.
 */

/**
 * @param {[]} translationFiles - an array of files
 * @param {{translationFormat: string, mode: string, spreadsheetId: string, credentials: {}, keyId: string, fileBaseName: string, namespaces: boolean, defaultLocaleName: string}} options
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

  const header = [];
  const data = [];

  // is the namespace feature used?
  if (options.namespaces) {
    header.push('namespace');
    keyIndexMap.namespace = header.length - 1;
  }

  header.push(options.keyId);
  keyIndexMap[options.keyId] = header.length - 1;

  async.each(translationFiles, function (file, cb) {

    // get the locale

    const extension = path.extname(file);
    const fileName = path.basename(file, extension);
    let namespace = '';
    let localeKey;

    // namespace based parsing required?
    if (options.namespaces) {
      const regex = /^(\w*?)([\-_])([\w\-]{2,5})$/gi
      const matches = regex.exec(fileName);

      if (!matches) {
        // we assume, that the whole filename is the namespace
        localeKey = options.defaultLocaleName ? options.defaultLocaleName : 'default'
        namespace = fileName;
      } else {
        namespace = matches[1];
        localeKey = matches[3];
      }
    } else {
      localeKey = fileName.substr(options.fileBaseName.length);
    }

    if (dataHeaderIndexMap[namespace] === undefined) {
      dataHeaderIndexMap[namespace] = {};
    }

    if (keyIndexMap[localeKey] === undefined) {
      header.push(localeKey);
      keyIndexMap[localeKey] = header.length - 1;
    }

    handler.getTranslationKeys(file, function (tData) {
      // data is a key value

      Object.keys(tData).forEach(function (key) {
        let rowIndex = dataHeaderIndexMap[namespace][key];

        if (rowIndex === undefined) {
          data.push([]);
          dataHeaderIndexMap[namespace][key] = data.length - 1
          rowIndex = dataHeaderIndexMap[namespace][key]
        }

        data[rowIndex][keyIndexMap[localeKey]] = tData[key];

        // namespace handling required?
        if (options.namespaces) {
          data[rowIndex][0] = namespace;
          data[rowIndex][1] = key;
        } else {
          data[rowIndex][0] = key;
        }

      });

      cb();
    })
  }, function (err) {
    const withoutError = require('./helpers').withoutError

    if (withoutError(err, callback)) {
      const connector = require('./connector')
      // console.log('data read done - start uploading')

      // let's sort the csvData before we upload
      data.sort(function (a, b) {
        let A = a[0] ? a[0].toLocaleLowerCase() : ''
        let B = b[0] ? b[0].toLocaleLowerCase() : ''

        if (A === B) {

          A = a[1] ? a[1].toLocaleLowerCase() : ''
          B = b[1] ? b[1].toLocaleLowerCase() : ''

          return A === B ? 0: (A < B ? -1 : 1);
        } else {
          return A < B ? -1 : 1;
        }
      });

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
                  } else {
                    // this looks like an initial upload, let's do it
                    if (cell.col <= header.length) {
                      let headerValue = header[cell.col - 1];
                      headerIndexMap[cell.col] = keyIndexMap[headerValue];
                      maxIndex = cell.col;
                      cell.value = headerValue;
                      changedCells.push(cell)
                    }
                  }
                } else if (cell.col <= maxIndex) {

                  // now we work with the actual data
                  // console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value)
                  let expectedValue = headerIndexMap[cell.col] !== undefined ? data[cell.row - 1][headerIndexMap[cell.col]] : ''

                  // we override the spreadsheet from the code
                  if (cell.value !== expectedValue) {
                    // console.log('Update Cell R' + cell.row + 'C' + cell.col + ' from ' + cell.value + ' to ' + expectedValue);

                    cell.value = expectedValue
                    changedCells.push(cell)
                  }
                }

              })

              if (changedCells.length > 0) {

                // console.log('Updating %s changed cells', changedCells.length)

                sheet.bulkUpdateCells(changedCells, function (err) {
                  if (withoutError(err, callback)) {
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
