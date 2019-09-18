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
          const translationData = {};
          const keyCellIndex = options.namespaces ? 1 : 0;
          const namespaceCellIndex = options.namespaces ? 0 : -1
          let key;
          let currentNamespace = 'default';

          cells.forEach(function (cell) {
            let rowIndex = cell.row - 1
            let cellIndex = cell.col - 1
            let val = cell.value.trim();

            if (rowIndex === 0) {
              headers[cellIndex] = val;
              if (cellIndex > keyCellIndex) {
                translationData[val] = {};
              }
            } else {

              switch (cellIndex) {
                default:
                  if (val && key) {
                    if (!translationData[headers[cellIndex]][currentNamespace]) {
                      translationData[headers[cellIndex]][currentNamespace] = {};
                    }

                    translationData[headers[cellIndex]][currentNamespace][key] = val;
                  }
                  break;
                case namespaceCellIndex:
                  currentNamespace = val;
                  break;
                case keyCellIndex:
                  key = val;
                  break;
              }
            }
          });

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
