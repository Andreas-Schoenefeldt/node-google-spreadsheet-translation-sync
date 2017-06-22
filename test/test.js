'use strict'

const path = require('path')
const expect = require('chai').expect
const app = require('../index')
const connector = require('../src/connector')
const accessData = require('./data/google-test-access.json')

const testSheetId = '1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI'

// preparations

const csv = require('fast-csv')
const targetPath = path.join(__dirname, 'data')
const testFile = path.join(targetPath, 'test.csv')
const csvData = [
  ['key', 'default', 'de', 'it', 'fr', 'pl'],
  ['additional.news', null, null, null, null, 'czecz ' + Math.round(Math.random() * 10000)],
  ['some.key', 'a Key ' + Math.round(Math.random() * 10000), 'ein Schlüssel ' + Math.round(Math.random() * 10000)]
]

csv.writeToPath(
  testFile, csvData, {headers: true}
)

// run the test
describe('#Export', function () {

  it('should connect to the test google doc', function (done) {

    connector(testSheetId, accessData, function (err, sheet) {
      expect(err).to.be.null
      expect(sheet).to.be.an('object')
      done()
    })
  })

  it('should not connect with wrong credentials', function (done) {
    connector('1eK_x1MKcoTQXXZhN4p3wuN94PVl2sGBh8KWuoBasBcM', accessData, function (err, sheet) {
      console.log(sheet)
      expect(err).to.not.be.null
      done()
    })
  })

  it('should export test project', function (done) {
    this.timeout(10000)

    app.exportToSpreadsheet(targetPath, testSheetId, accessData, function (targetPath, callback) {
      callback(null, testFile)
    }, function (err) {
      expect(err).to.be.null

      if (!err) {
        connector(testSheetId, accessData, function (err, sheet) {
          expect(err).to.be.null
          expect(sheet).to.be.an('object')

          sheet.getRows({
            offset: 0,
            limit: csvData.length - 1
          }, function (err, rows) {
            expect(err).to.be.null
            expect(rows).to.have.lengthOf(csvData.length - 1)
            expect(rows[0].pl).to.equal(csvData[1][5])
            expect(rows[1].default).to.equal(csvData[2][1])
            expect(rows[1].de).to.equal(csvData[2][2])
            expect(rows[1].key).to.equal(csvData[2][0])
            done()
          })
        })
      } else {
        done()
      }

    })
  })

})

