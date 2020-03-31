'use strict'

module.exports = function (translationRootFolder, options, callback) {

  const connector = require('./connector');
  const withoutError = require('./helpers').withoutError;
  const sheetId = options.spreadsheetId;
  const credentials = options.credentials;
  const translationFormat = options.translationFormat;

  connector(sheetId, options.gid, credentials, function (err, sheet) {

    if (withoutError(err, callback)) {

      /** @var {SpreadsheetWorksheet} sheet */
      sheet.loadCells({
        'startRowIndex': 0,
        'endRowIndex': sheet.rowCount
      }).then(
          function () {

            const columnCount = sheet.columnCount;

            const headers = [];
            const translationData = {};
            const keyCellIndex = options.namespaces ? 1 : 0;
            const namespaceCellIndex = options.namespaces ? 0 : -1;
            let key;
            let currentNamespace = 'default';
            let rowIndex;
            let cellIndex;

            // loop over all the cells

            for (rowIndex = 0; rowIndex < sheet.rowCount; rowIndex++) {
              for (cellIndex = 0; cellIndex < columnCount; cellIndex++) {
                let cell = sheet.getCell(rowIndex, cellIndex);
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
              }
            }

            // now we get the handler
            const h = require('./handler');
            const TRANSLATION_FORMATS = require('./util/constraints').TRANSLATION_FORMATS;
            const handler = h.getHandler(translationFormat ? translationFormat : TRANSLATION_FORMATS.LOCALE_JSON );

            handler.updateTranslations(translationData, translationRootFolder, options, callback);

          },
          function (err) {
            callback(err);
          }
      );
    }
  })
};
