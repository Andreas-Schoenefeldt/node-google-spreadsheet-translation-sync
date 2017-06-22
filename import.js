'use strict'

const sheetId = '1hquyoD7DBdG_K0FxRy6L6a-ejRgXLRk3fnc5nBGlhzw' // dw-connect translations
const path = require('path')

console.log('this script runs at %s', __dirname)

let exportPath = path.join(__dirname, 'tmp')

const credentials = require('./projects/dw-connect-credentials.json')
const app = require('./index')

app.importFromSpreadsheet(exportPath, sheetId, credentials)

