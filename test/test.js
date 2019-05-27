'use strict'

const path = require('path')
const expect = require('chai').expect
const app = require('../index')
const connector = require('../src/connector')
const accessData = require('./data/google-test-access.json')
const tmp = require('tmp');

const testSheetId = '1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI'
const testSheetId_gettext = '1CRvX4TCxUGCcs_MtKC5BdEViHYzYzLXdqtbuVaAXfKc'
const timeout = 20000;

// preparations

var tmpFile = tmp.fileSync({postfix: '.csv'});

const csv = require('fast-csv')
const testFile = tmpFile.name;
const targetPath = path.basename(testFile);
const csvData = [
  ['key', 'default', 'de', 'it', 'fr', 'pl'],
  ['additional.news', null, null, null, null, 'czecz ' + Math.round(Math.random() * 10000)],
  ['some.key', 'a Key ' + Math.round(Math.random() * 10000), 'ein Schlüssel ' + Math.round(Math.random() * 10000)]
]

csv.writeToPath(
  testFile, csvData, {headers: true}
)


const tests = [
   {
     name: 'should connect to the test google doc',
     run: true,
     fnc: function (done) {
      this.timeout(timeout);

      connector(testSheetId, accessData, function (err, sheet) {

        if (err) {
          console.log('Connection Error: ')
          console.log(err);
        }

        expect(err).to.be.null
        expect(sheet).to.be.an('object')
        done()
      })
    }
  },

  {
    name: 'should not connect with wrong credentials',
    run: true,
    fnc: function (done) {
      this.timeout(timeout);

      connector('1eK_x1MKcoTQXXZhN4p3wuN94PVl2sGBh8KWuoBasBcM', accessData, function (err, sheet) {
        console.log(sheet)
        expect(err).to.not.be.null
        done()
      })
    }
  },

  {
    name: 'should import updated locale_json keys in the test project',
    run: true,
    fnc: function (done) {
      this.timeout(timeout);

      const options = {
        translationFormat: 'locale_json',
        spreadsheetId: testSheetId,
        credentials: accessData
      }

      const translationRoot = path.resolve('./test/translations/' + options.translationFormat + '/');
      const testFile = path.resolve(translationRoot + '/default.json');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const defaultKeys = require(testFile);

          expect(Object.keys(defaultKeys).length).to.equal(325);
          expect(defaultKeys.return).to.equal("Go back");
        }

        done();
      });
    }
  },

  {
    name: 'should import updated gettext keys in the test project',
    run: true,
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'karmapa-chenno';

      const options = {
        translationFormat: 'gettext',
        fileBaseName: baseName,
        spreadsheetId: testSheetId_gettext,
        credentials: accessData
      }

      const translationRoot = path.resolve('./test/translations/' + options.translationFormat + '/');
      const testFile = path.resolve(translationRoot + '/' + baseName + '-en.po');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const fs = require('fs');

          expect(fs.existsSync(testFile)).to.equal(true);

          const po = require('gettext-parser').po.parse(fs.readFileSync(testFile));
          const translations = po.translations[''];

          expect(translations.add_address.msgstr[0]).to.equal("Add new address");
        }

        done();
      });
    }
  },

  {
    name: 'should upload changes in the test project',
    run: true,
    fnc: function (done) {
      this.timeout(timeout);

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
              expect(rows[0].default).to.equal('')
              expect(rows[0].hu).to.equal('Elfogadom') // this was not part of the upload and should not be overwrittem
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
    }
  }
]


// run the test
describe('#Export', function () {

  for (let i = 0; i < tests.length; i++) {
    const theTest = tests[i];

    if (theTest.run) {
      it(theTest.name, theTest.fnc);
    }
  }
});
