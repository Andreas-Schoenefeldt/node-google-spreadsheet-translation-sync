const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

/**
 * connects to a google spreadsheet and returns the first sheet
 *
 * @param {string} sheetId
 * @param {string|null} [worksheetId='0']
 * @param credentials
 * @param callback
 * @returns {boolean}
 */
module.exports = async function (sheetId, worksheetId, credentials, callback) {

    if (typeof callback !== "function") {
        throw new Error('Please provide a callback');
    }

    const serviceAccountAuth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // docu: https://www.npmjs.com/package/google-spreadsheet
    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);

    let error = false;

    await doc.loadInfo(true).catch((err) => {
        error = true;
        callback(err);
    });

    if (!error) {
        worksheetId = worksheetId ? worksheetId : '0';
        const sheet = doc.sheetsById[worksheetId];

        if (!sheet) {
            callback('The sheet with the gid ' + worksheetId + ' does not exist.');
        }

        console.log('Loaded doc: ' + doc.title + ' with ' + sheet.rowCount + ' rows');

        callback(null, sheet);
    }
};
