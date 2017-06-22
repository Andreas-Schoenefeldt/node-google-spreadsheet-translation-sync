'use strict'

module.exports = function (localPath, sheetId, credentials) {

  const connector = require('./connector')

  connector(sheetId, credentials, function (sheet) {

  })

}
