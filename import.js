'use strict'

const testSheetId = '1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI'
const path = require('path')

console.log('this script runs at %s', __dirname)

let exportPath = path.join(__dirname, 'tmp')

const credentials = require('./test/data/google-test-access.json')
const importer = require('./src/import-from-spreadsheet')

importer(exportPath, testSheetId, credentials)