'use strict'

module.exports = function (translationRootFolder, options, callback) {

  const connector = require('./connector')
  const withoutError = require('./helpers').withoutError
  const sheetId = options.spreadsheetId
  const credentials = options.credentials
  const translationFormat = options.translationFormat

  connector(sheetId, credentials, function (err, sheet) {

    if (withoutError(err, callback)) {

      /** @var {SpreadsheetWorksheet} sheet */
      sheet.getCells({
        'min-row': 1,
        'max-row': sheet.rowCount,
        'return-empty': false
      }, function (err, cells) {
        if (withoutError(err, callback)) {

          const headers = [];
          const translationData = {}
          let key;

          cells.forEach(function (cell) {
            let rowIndex = cell.row - 1
            let cellIndex = cell.col - 1
            let val = cell.value.trim();

            if (rowIndex === 0) {
              headers[cellIndex] = val;
              if (cellIndex > 0) {
                translationData[val] = {};
              }
            } else {
              if (cellIndex === 0) {
                key = val;
              } else if (val && key) {
                translationData[headers[cellIndex]][key] = val;
              }
            }
          })

          // now we get the handler
          const h = require('./handler');
          const TRANSLATION_FORMATS = require('./util/constraints').TRANSLATION_FORMATS
          const handler = h.getHandler(translationFormat ? translationFormat : TRANSLATION_FORMATS.LOCALE_JSON );

          handler.updateTranslations(translationData, translationRootFolder, options, callback);

        }
      })
    }
  })

}
