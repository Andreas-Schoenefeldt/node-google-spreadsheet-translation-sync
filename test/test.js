'use strict'

const expect = require('chai').expect
const sheetTranslationSync = require('../index')
const accessData = require('./data/google-test-access.json')

const testSheetId = "1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI"

describe('#translationSync', function () {
  it('should connect to the test google doc', function () {
    let result = sheetTranslationSync(testSheetId, accessData)
    expect(result).to.be.true
  })


})
