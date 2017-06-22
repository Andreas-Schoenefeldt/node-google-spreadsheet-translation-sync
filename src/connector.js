/**
 * connects to a google spreadsheet and returns the first sheet
 *
 * @param sheetId
 * @param credentials
 * @param callback
 * @returns {boolean}
 */
module.exports = function (sheetId, credentials, callback) {

  const GoogleSpreadsheet = require('google-spreadsheet')
  const async = require('async')
  const withoutError = require('./helpers').withoutError

  const doc = new GoogleSpreadsheet(sheetId)
  let sheet


  // docu: https://www.npmjs.com/package/google-spreadsheet
  async.series([
    function setAuth (step) {
      console.log('authenticating...')
      doc.useServiceAccountAuth(credentials, step)
    },

    function getInfoAndWorksheets (step) {
      doc.getInfo(function (err, info) {
        if (withoutError(err, callback)) {
          console.log('Loaded doc: ' + info.title + ' by ' + info.author.email)
          sheet = info.worksheets[0]
          console.log('sheet 1: ' + sheet.title + ' ' + sheet.rowCount + 'x' + sheet.colCount)
          callback(null, sheet)
          step()
        }
      })
    }
  ], function (err) {
    withoutError(err, callback)
  })

  return true
}