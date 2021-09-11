const { GoogleSpreadsheet } = require('google-spreadsheet');

/**
 * connects to a google spreadsheet and returns the first sheet
 *
 * @param {string} sheetId
 * @param {string|null} worksheetId
 * @param credentials
 * @param callback
 * @returns {boolean}
 */
module.exports = function (sheetId, worksheetId, credentials, callback) {

    if (typeof callback !== "function") {
        throw new Error('Please provide a callback');
    }

    // docu: https://www.npmjs.com/package/google-spreadsheet
    const doc = new GoogleSpreadsheet(sheetId);

    doc.useServiceAccountAuth(credentials).then(
        function () {
            doc.loadInfo(true).then(function () {
                    const sheetId = worksheetId ? worksheetId : '0';
                    const sheet = doc.sheetsById[sheetId];

                    if (!sheet) {
                        throw new Error('The sheet with the gid ' + sheetId + ' does not exist.');
                    }

                    // console.log('Loaded doc: ' + doc.title + ' with ' + sheet.rowCount + ' rows');

                    callback(null, sheet);
                },
                function (err) {
                    callback(err);
                });
        }
    ).catch(function (err) {
        callback(err);
    });

    return true
};
