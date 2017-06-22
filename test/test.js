'use strict'

const expect = require('chai').expect
const sheetTranslationSync = require('../index')
const connector = require('../src/connector')
const accessData = require('./data/google-test-access.json')

const testSheetId = "1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI"

describe('#translationSync', function () {
  it('should connect to the test google doc', function () {
    connector(testSheetId, accessData, function (sheet) {
      expect(sheet).to.be.an('object')
    })

  })


})
