'use strict'
/**
 * Created by Andreas on 22/06/17.
 */

/**
 * @param {[]} translationFiles - an array of files
 * @param {OptionsObject} options
 * @param {function} callback
 */
module.exports = function (translationFiles, options, callback) {

  const path = require("path");
  const async = require('async')

  const sheetId = options.spreadsheetId;
  const credentials = options.credentials || require('../test/data/access');
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
      localeKey = fileName.substr(options.fileBaseName.length + (options.namespaceSeparator ? options.namespaceSeparator.length : 0));
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
    const withoutError = require('./helpers').withoutError;

    if (withoutError(err, callback)) {
      const connector = require('./connector');
      // console.log('data read done - start uploading')

      // let's sort the csvData before we upload
      data.sort(function (a, b) {
        let A = a[0] ? a[0].toLocaleLowerCase() : '';
        let B = b[0] ? b[0].toLocaleLowerCase() : '';

        if (A === B) {

          A = a[1] ? a[1].toLocaleLowerCase() : '';
          B = b[1] ? b[1].toLocaleLowerCase() : '';

          return A === B ? 0: (A < B ? -1 : 1);
        } else {
          return A < B ? -1 : 1;
        }
      });

      // add the header
      data.unshift(header);

      // upload to google
      connector(sheetId, options.gid, credentials,
          /**
           *
           * @param err
           * @param {GoogleSpreadsheetWorksheet} sheet
           */
          function (err, sheet) {
            if (withoutError(err, callback)) {

              if (sheet.rowCount < data.length) {
                // this is an error
                callback(`The selected sheet ${options.gid} has not enough rows for the data. It needs ${data.length - sheet.rowCount} rows more.`);
              } else {

                sheet.loadCells({
                  'startRowIndex': 0,
                  'endRowIndex': data.length,
                  'startColumnIndex': 0,
                  'endColumnIndex': sheet.columnCount
                }).then(
                    function () {
                      const DATA_CHUNK_ROW_COUNT = 300;
                      let headerIndexMap = {};
                      let cellIndex;
                      let maxIndex = 0;

                      // build the header
                      for (cellIndex = 0; cellIndex < sheet.columnCount; cellIndex++) {
                        let cell = sheet.getCell(0, cellIndex);


                        // this is the header row
                        if (cell.value) {
                          // clear comments from the header name
                          let cleanLocale = cell.value.split('#')[0].trim();
                          headerIndexMap[cellIndex] = keyIndexMap[cleanLocale];
                          maxIndex = cellIndex
                        } else {
                          // this looks like an initial upload, let's do it
                          if (cellIndex <= header.length) {
                            let headerValue = header[cellIndex];
                            headerIndexMap[cellIndex] = keyIndexMap[headerValue];
                            maxIndex = cellIndex;
                            cell.value = headerValue;
                          }
                        }
                      }

                      // now we run recursively over our data in 300er chunks
                      const updateCells = function (rowIndexStart) {

                        const rowIndexRunMax = rowIndexStart + DATA_CHUNK_ROW_COUNT;

                        for (let rowIndex = rowIndexStart; rowIndex < data.length && rowIndex <= rowIndexRunMax; rowIndex++) {
                          for (cellIndex = 0; cellIndex < sheet.columnCount; cellIndex++) {
                            if (cellIndex <= maxIndex) {

                              let cell = sheet.getCell(rowIndex, cellIndex);

                              // now we work with the actual data
                              // console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value)
                              let expectedValue = headerIndexMap[cellIndex] !== undefined ? data[rowIndex][headerIndexMap[cellIndex]] : '';

                              // we override the spreadsheet from the code
                              if (cell.value !== expectedValue) {
                                // console.log('Update Cell R' + cell.row + 'C' + cell.col + ' from ' + cell.value + ' to ' + expectedValue);

                                cell.value = expectedValue;
                              }
                            }

                          }
                        }

                        // console.log(`Uploading rows ${rowIndexStart} - ${Math.min(rowIndexRunMax, data.length)}`);

                        sheet.saveUpdatedCells().then(function () {

                          if (data.length >= rowIndexRunMax) {
                            // update the next chunk
                            updateCells(rowIndexRunMax + 1);
                          } else {
                            // we are done :)
                            callback(null);
                          }
                        }).catch(function (err) {
                          // well, apparently something went wrong
                          callback(err);
                        });
                      };

                      // update the data
                      updateCells(1);
                    }
                ).catch(function (err) {
                  callback(err);
                });
              }
            }
          }
      );
    }
  });
};
