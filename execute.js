'use strict'

const connector = require('./index')
const credentials = require('./test/data/google-test-access.json')
const testSheetId = "1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI"

connector(testSheetId, credentials)

