'use strict'

const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const app = require('../index');
const connector = require('../src/connector');
const accessData = require('./data/google-test-access.json');
const tmp = require('tmp');
const async = require('async');

const testSheetId = '1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI';
const testWorksheetId = '1209225803';
const testSheetId_gettext = '1CRvX4TCxUGCcs_MtKC5BdEViHYzYzLXdqtbuVaAXfKc';
const testSheetId_properties = '1Z0Mpbf6lgdGiuiHlpb9DENVfKxkxSRwcfQEDYrgokEE';
const timeout = 20000;

// preparations

var tmpFile = tmp.fileSync({postfix: '.csv'});

const csv = require('fast-csv');
const testFile = tmpFile.name;
const targetPath = path.basename(testFile);
const csvData = [
  ['key', 'default', 'de', 'it', 'fr', 'pl', 'hu'],
  ['additional.news.' + Math.round(Math.random() * 10000), 'Additional News', null, null, null, 'czecz ' + Math.round(Math.random() * 10000), 'Elfogadom'],
  ['some.key', 'a Key ' + Math.round(Math.random() * 10000), 'ein Schlüssel ' + Math.round(Math.random() * 10000)]
];

// this provokes the "Cannot read property 'toLocaleLowerCase' of undefined" ERROR
const frOnlyLine = ['zz.somehow', undefined, '?'];
frOnlyLine[4] = 'bon';
const frOnlyLine2 = ['ZZ.someHow', undefined, '?'];
frOnlyLine2[4] = 'bon!';

csvData.push(frOnlyLine);
csvData.push(frOnlyLine2);


csv.writeToPath(
  testFile, csvData, {headers: true}
);

function ensureFolder (folder) {
  if (!fs.existsSync(folder)){
    fs.mkdirSync(folder);
  }
  return folder;
}


// const testFor = 'all' // 'connect', 'upload', 'import'
const testFor = 'all';

const tests = [
  {
     name: 'should connect to the test google doc',
     run: 'connect',
     fnc: function (done) {
      this.timeout(timeout);

      connector(testSheetId, null, accessData, function (err, sheet) {

        if (err) {
          console.log('Connection Error: ');
          console.log(err);
        }

        expect(err).to.be.null;
        expect(sheet).to.be.an('object');
        done()
      })
    }
  },

  {
    name: 'should not connect with wrong credentials',
    run: 'connect',
    fnc: function (done) {
      this.timeout(timeout);

      connector('1eK_x1MKcoTQXXZhN4p3wuN94PVl2sGBh8KWuoBasBcM', null, accessData, function (err, sheet) {
        expect(err).to.not.be.null
        done()
      })
    }
  },

  {
    name: 'should connect to a specific sheet',
    run: 'connect',
    fnc: function (done) {
      this.timeout(timeout);

      connector(
        testSheetId,
        testWorksheetId,
        accessData,

        /**
         *
         * @param err
         * @param {GoogleSpreadsheetWorksheet} sheet
         */
        function (err, sheet) {
          expect(err).to.be.null;
          expect(sheet).to.not.be.null;
          expect(sheet.sheetId).to.equal(parseInt(testWorksheetId));
          done()
        }
      )
    }
  },

  {
    name: 'should upload changes in the namespace properties test project',
    run: 'upload',
    fnc: function (done) {

      const PropertiesReader = require('properties-reader');

      this.timeout(timeout);

      const fs = require('fs');
      const options = {
        translationFormat: 'properties',
        spreadsheetId: testSheetId_properties,
        keyId: csvData[0][0],
        defaultLocaleName: 'default',
        namespaces: true,
        namespaceSeparator: '_',
        credentials: accessData
      }

      const namespaces = ['messages', 'other'];
      const fileItems = [];
      const files = [];
      const entryLength = csvData.length - 1;

      const tempFolder = tmp.dirSync({prefix: 'trans-properties-to-update'});

      csvData[0].forEach( function (key, index) {
        if (index > 0) {

          namespaces.forEach(function (namespace) {
            const propertiesFile = tempFolder.name + '/' + namespace + ( options.defaultLocaleName === key ? '' : '_' + key) + '.properties';
            fs.writeFileSync(propertiesFile, '');
            const fileItem = {
              file: propertiesFile,
              namespace: namespace,
              locale: key,
              reader: PropertiesReader(propertiesFile, {write_sections: false})
            }

            csvData.forEach(function (lines, i) {
              if (i > 0 && lines[index] ) {
                fileItem.reader.set(lines[0], lines[index]);
              }
            });

            files.push(propertiesFile);
            fileItems.push(fileItem);

          });
        }
      });

      async.every(fileItems, function(fileItem, callback) {
        fileItem.reader.save(fileItem.file).then(function () {
          callback(null, true)
        }, function () {
          callback(null, false)
        })
      }, function (err, result) {
        const rimraf = require("rimraf");

        expect(err).to.be.null;
        expect(result).to.equal(true);

        if (!err && result) {
          app.exportToSpreadsheet(files, options, function (err) {
            const rimraf = require("rimraf");
            expect(err).to.be.null;

            if (!err) {
              connector(options.spreadsheetId, options.gid, accessData, function (err, sheet) {
                expect(err).to.be.null;
                expect(sheet).to.be.an('object');

                sheet.getRows({
                  offset: 0,
                  limit: (csvData.length - 1) * namespaces.length + 1
                }).then(function (rows) {
                  expect(rows).to.have.lengthOf((csvData.length - 1) * 2);
                  expect(rows[0][options.keyId]).to.equal(csvData[1][0]);
                  expect(rows[0].pl).to.equal(csvData[1][5]);
                  expect(rows[0].default).to.equal(csvData[1][1]);
                  expect(rows[0].hu).to.equal('Elfogadom');
                  expect(rows[0].namespace).to.equal(namespaces[0]);
                  expect(rows[1].default).to.equal(csvData[2][1]);
                  expect(rows[1].de).to.equal(csvData[2][2]);
                  expect(rows[1].key).to.equal(csvData[2][0]);
                  // this should be already the next namespace
                  expect(rows[entryLength].namespace).to.equal(namespaces[1]);
                  rimraf.sync(tempFolder.name);
                  done()
                })
              })
            } else {

              console.log(err);

              rimraf.sync(tempFolder.name);
              done()
            }

          })
        } else {
          rimraf.sync(tempFolder.name);
          done()
        }
      });
    }
  },

  {
    name: 'should upload changes in the json test project',
    run: 'upload',
    fnc: function (done) {
      this.timeout(timeout);

      const fs = require('fs');
      const options = {
        translationFormat: 'locale_json',
        spreadsheetId: testSheetId,
        keyId: csvData[0][0],
        fileBaseName: 'messages-',
        credentials: accessData
      }

      const files = [];

      const tempFolder = tmp.dirSync({prefix: 'trans-dyn-to-update'});

      csvData[0].forEach( function (key, index) {
        if (index > 0) {
          const jsonFile = tempFolder.name + '/' + options.fileBaseName + key + '.json';
          const data = {};
          csvData.forEach(function (lines, i) {
            if (i > 0 && lines[index]) {
              data[lines[0]] = lines[index];
            }
          });

          fs.writeFileSync(jsonFile, JSON.stringify(data));
          files.push(jsonFile);
        }
      });

      app.exportToSpreadsheet(files, options, function (err) {
        const rimraf = require("rimraf");
        expect(err).to.be.null;

        if (!err) {
          connector(options.spreadsheetId, options.gid, accessData, function (err, sheet) {
            expect(err).to.be.null;
            expect(sheet).to.be.an('object');

            sheet.getRows({
              offset: 0,
              limit: csvData.length - 1
            }).then(function (rows) {
              expect(rows).to.have.lengthOf(csvData.length - 1);
              expect(rows[0][options.keyId]).to.equal(csvData[1][0]);
              expect(rows[0].pl).to.equal(csvData[1][5]);
              expect(rows[0].default).to.equal(csvData[1][1]);
              expect(rows[0].hu).to.equal('Elfogadom'); // this was not part of the upload and should not be overwrittem
              expect(rows[1].default).to.equal(csvData[2][1]);
              expect(rows[1].de).to.equal(csvData[2][2]);
              expect(rows[1].key).to.equal(csvData[2][0]);
              rimraf.sync(tempFolder.name);
              done()
            })
          })
        } else {
          rimraf.sync(tempFolder.name);
          done()
        }

      })
    }
  },

  {
    name: 'should import updated properties keys in the test project',
    run: 'import',
    fnc: function (done) {
      this.timeout(timeout);

      const options = {
        translationFormat: 'properties',
        spreadsheetId: testSheetId_properties,
        keyId: csvData[0][0],
        defaultLocaleName: 'default',
        namespaces: true,
        namespaceSeparator: '_',
        credentials: accessData
      }

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null;

        if (!err) {
          const testFile = path.resolve(translationRoot + '/other.properties');
          const PropertiesReader = require('properties-reader');

          const props = PropertiesReader(testFile);

          // expect(Object.keys(props.getAllProperties()).length).to.equal(csvData.length - 1); // without the header
          expect(props.get(csvData[2][0])).to.equal(csvData[2][1]);
        }

        done();
      });


    }
  },

  {
    name: 'should import updated locale_json keys in the test project',
    run: 'import',
    fnc: function (done) {
      this.timeout(timeout);

      const options = {
        translationFormat: 'locale_json',
        spreadsheetId: testSheetId,
        credentials: accessData
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
      const testFile = path.resolve(translationRoot + '/default.json');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const defaultKeys = require(testFile);

          // expect(Object.keys(defaultKeys).length).to.equal(326);
          expect(defaultKeys[csvData[2][0]]).to.equal(csvData[2][1]);
        }

        done();
      });
    }
  },

  {
    name: 'should import updated gettext keys in the test project',
    run: 'import',
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'karmapa-chenno';

      const options = {
        translationFormat: 'gettext',
        fileBaseName: baseName,
        spreadsheetId: testSheetId_gettext,
        credentials: accessData
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
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
  }
];


// run the test
describe('#Export', function () {

  for (let i = 0; i < tests.length; i++) {
    const theTest = tests[i];

    if (testFor === 'all' || theTest.run === testFor) {
      it(theTest.name, theTest.fnc);
    }
  }
});
