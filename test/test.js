'use strict'

const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const app = require('../index');
const connector = require('../src/connector');
const accessData = require('./data/access');
const tmp = require('tmp');
const async = require('async');

const testSheetId = '1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI'; // https://docs.google.com/spreadsheets/d/1ZJK1G_3wrEo9lnu1FenjOzSy3uoAi-RLWbph1cI6DWI/edit#gid=0
const testWorksheetId = '1209225803';
const testSheetId_gettext = '1CRvX4TCxUGCcs_MtKC5BdEViHYzYzLXdqtbuVaAXfKc'; // https://docs.google.com/spreadsheets/d/1CRvX4TCxUGCcs_MtKC5BdEViHYzYzLXdqtbuVaAXfKc/edit#gid=0
const testSheetId_properties = '1Z0Mpbf6lgdGiuiHlpb9DENVfKxkxSRwcfQEDYrgokEE'; // https://docs.google.com/spreadsheets/d/1Z0Mpbf6lgdGiuiHlpb9DENVfKxkxSRwcfQEDYrgokEE/edit#gid=0
const testSheetId_yaml = '1Ml3jLK6RgbPQ4e7XZpILvB-XWMeziHpwdxS8r4AYNtE'; // https://docs.google.com/spreadsheets/d/1Ml3jLK6RgbPQ4e7XZpILvB-XWMeziHpwdxS8r4AYNtE/edit#gid=0
const timeout = 20000;

// preparations

var tmpFile = tmp.fileSync({postfix: '.csv'});

const csv = require('fast-csv');
const testFile = tmpFile.name;
const csvData = [
  ['key', 'default', 'de', 'it', 'fr', 'pl', 'hu'],
  ['additional.news.' + Math.round(Math.random() * 10000), 'Additional News', null, null, null, 'czecz ' + Math.round(Math.random() * 10000), 'Elfogadom'],
  ['some.key', 'a Key ' + Math.round(Math.random() * 10000), 'ein Schlüssel ' + Math.round(Math.random() * 10000)],
];

// this provokes the "Cannot read property 'toLocaleLowerCase' of undefined" ERROR
const frOnlyLine = ['zz.somehow', undefined, '?'];
frOnlyLine[4] = 'bon';
const frOnlyLine2 = ['ZZ.someHow', undefined, '?'];
frOnlyLine2[4] = 'bon!';

csvData.push(frOnlyLine);
csvData.push(frOnlyLine2);
csvData.push(['some.other', 'with : colon', 'mit : Doppelpunkt']);


csv.writeToPath(
  testFile, csvData, {headers: true}
);

function ensureFolder (folder) {
  if (!fs.existsSync(folder)){
    fs.mkdirSync(folder, {
      recursive: true
    });
  }
  return folder;
}


// const testFor = 'all' // 'connect', 'upload', 'import', 'properties', 'locale_json', 'gettext', 'yml', 'json_structure', 'wordpress'
// const testFor = 'gettext';
const testFor = 'all';

const tests = [
  {
     name: 'should connect to the test google doc',
     run: ['connect'],
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
    run: ['connect'],
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
    run: ['connect'],
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
    run: ['upload', 'properties'],
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
              reader: PropertiesReader(propertiesFile, 'utf-8', { writer: { saveSections: false } })
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
                  expect(rows[0].get(options.keyId)).to.equal(csvData[1][0]);
                  expect(rows[0].get('pl # with comment')).to.equal(csvData[1][5]);
                  expect(rows[0].get('default')).to.equal(csvData[1][1]);
                  expect(rows[0].get('hu')).to.equal('Elfogadom');
                  expect(rows[0].get('namespace')).to.equal(namespaces[0]);
                  expect(rows[1].get('default')).to.equal(csvData[2][1]);
                  expect(rows[1].get('de')).to.equal(csvData[2][2]);
                  expect(rows[1].get(options.keyId)).to.equal(csvData[2][0]);
                  // this should be already the next namespace
                  expect(rows[entryLength].get('namespace')).to.equal(namespaces[1]);
                  rimraf.sync(tempFolder.name);
                  done()
                }).catch(err => {
                  console.log(err);
                  expect(err).to.be.null;
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
    run: ['upload', 'locale_json'],
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
              expect(rows[0].get(options.keyId)).to.equal(csvData[1][0]);
              expect(rows[0].get('pl # with comment')).to.equal(csvData[1][5]);
              expect(rows[0].get('default')).to.equal(csvData[1][1]);
              expect(rows[0].get('hu')).to.equal('Elfogadom'); // this was not part of the upload and should not be overwrittem
              expect(rows[1].get('default')).to.equal(csvData[2][1]);
              expect(rows[1].get('de')).to.equal(csvData[2][2]);
              expect(rows[1].get(options.keyId)).to.equal(csvData[2][0]);
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
    run: ['import', 'properties'],
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
          const testFilePl = path.resolve(translationRoot + '/other_pl.properties');
          const PropertiesReader = require('properties-reader');

          const props = PropertiesReader(testFile);
          const propsPl = PropertiesReader(testFilePl);

          // expect(Object.keys(props.getAllProperties()).length).to.equal(csvData.length - 1); // without the header
          expect(props.get(csvData[2][0])).to.equal(csvData[2][1]);
          expect(propsPl.get(csvData[1][0])).to.equal(csvData[1][5]);
        }

        done();
      });


    }
  },

  {
    name: 'should import updated locale_json keys in the test project',
    run: ['import', 'locale_json'],
    fnc: function (done) {
      this.timeout(timeout);

      const options = {
        translationFormat: 'locale_json',
        spreadsheetId: testSheetId,
        credentials: accessData
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
      const testFile = path.resolve(translationRoot + '/default.json');
      const testFilePl = path.resolve(translationRoot + '/pl.json');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const defaultKeys = require(testFile);
          const plKeys = require(testFilePl);

          // expect(Object.keys(defaultKeys).length).to.equal(326);
          expect(defaultKeys[csvData[2][0]]).to.equal(csvData[2][1]);
          expect(plKeys[csvData[1][0]]).to.equal(csvData[1][5]);
        }

        done();
      });
    }
  },

  {
    name: 'should import updated wordpress keys in the test project',
    run: ['import', 'wordpress'],
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'karmapa-chenno';

      const options = {
        translationFormat: 'wordpress',
        fileBaseName: baseName,
        spreadsheetId: testSheetId_gettext,
        credentials: accessData
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
      const testFile = path.resolve(translationRoot + '/' + baseName + '-en.po');
      const testFilePhp = path.resolve(translationRoot + '/' + baseName + '-en.l10n.php');
      const testFilePl = path.resolve(translationRoot + '/' + baseName + '-pl.po');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const fs = require('fs');

          expect(fs.existsSync(testFile)).to.equal(true);

          const po = require('gettext-parser').po.parse(fs.readFileSync(testFile));
          const poPl = require('gettext-parser').po.parse(fs.readFileSync(testFilePl));
          const translations = po.translations[''];
          const translationsPl = poPl.translations[''];
          expect(translations.add_address.msgstr[0]).to.equal("Add new address");
          expect(translationsPl['additional.news'].msgstr[0]).to.equal('czecz 2242');
          expect(translationsPl.add_address).to.be.undefined;

          const phpContent = fs.readFileSync(testFilePhp).toString();

          expect(phpContent).to.equal('<?php\n' +
              'return [\n' +
              '  "content-type" => "text/plain; charset=utf-8",\n' +
              '  "plural-forms" => "nplurals=2; plural=(n!=1);",\n' +
              '  "x-generator" => "node-google-spreadsheet-translation-sync",\n' +
              '  "project-id-version" => "karmapa-chenno",\n' +
              '  "language" => "en",\n' +
              '  "messages" => [\n' +
              '    "add_address" => "Add new address",\n' +
              '    "add_as_favourite" => "Add to Quick Contacts",\n' +
              '    "add_center" => "Add Center",\n' +
              '    "add_contact" => "Add contact",\n' +
              '    "add_phone_number" => "Add new phone",\n' +
              '    "additional.news" => "Additional News",\n' +
              '    "administration" => "Administration",\n' +
              '    "administration_info" => "This page allows you to access functions connected to Members, Centers, Roles and Groups.",\n' +
              '    "all" => "All",\n' +
              '    "all_centers" => "All Centers",\n' +
              '    "all_contacts" => "All contacts",\n' +
              '    "some.key" => "a Key 370",\n' +
              '  ]\n' +
              '];\n');

        }

        done();
      });
    }
  },

  {
    name: 'should import updated gettext keys in the test project',
    run: ['import', 'gettext'],
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
      const testFilePl = path.resolve(translationRoot + '/' + baseName + '-pl.po');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const fs = require('fs');

          expect(fs.existsSync(testFile)).to.equal(true);

          const po = require('gettext-parser').po.parse(fs.readFileSync(testFile));
          const poPl = require('gettext-parser').po.parse(fs.readFileSync(testFilePl));
          const translations = po.translations[''];
          const translationsPl = poPl.translations[''];
          expect(translations.add_address.msgstr[0]).to.equal("Add new address");
          expect(translationsPl['additional.news'].msgstr[0]).to.equal('czecz 2242');
          expect(translationsPl.add_address).to.be.undefined;
        }

        done();
      });
    }
  },

  {
    name: 'should fill empty columns with the default',
    run: ['import', 'gettext'],
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'om-mani-peme';

      const options = {
        translationFormat: 'gettext',
        fileBaseName: baseName,
        spreadsheetId: testSheetId_gettext,
        credentials: accessData,
        defaultLocaleName: 'en',
        defaultFallback: true
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
      const testFile = path.resolve(translationRoot + '/' + baseName + '-en.po');
      const testFileDe = path.resolve(translationRoot + '/' + baseName + '-de.po');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const fs = require('fs');

          expect(fs.existsSync(testFile)).to.equal(true);

          const po = require('gettext-parser').po.parse(fs.readFileSync(testFile));
          const poDe = require('gettext-parser').po.parse(fs.readFileSync(testFileDe));
          const translations = po.translations[''];
          const translationsDe = poDe.translations[''];
          expect(translations['additional.news'].msgstr[0]).to.equal("Additional News");
          expect(translationsDe['additional.news']?.msgstr[0]).to.equal('Additional News');
        }

        done();
      });
    }
  },

  {
    name: 'should upload changes in the yaml test project',
    run: ['upload', 'yml'],
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'messages';

      const fs = require('fs');
      const options = {
        translationFormat: 'yml',
        fileBaseName: baseName,
        keyId: csvData[0][0],
        gid: 0,
        namespaceSeparator: '.',
        spreadsheetId: testSheetId,
        credentials: accessData
      }

      const files = [];

      const tempFolder = tmp.dirSync({prefix: 'trans-dyn-to-update'});
      const yamlHandler = require('../src/handlers/yaml');
      const fileUtils = require('../src/util/file-utils');

      const data = {};

      csvData[0].forEach( function (key, index) {

        if (index > 0) {
          data[key] = {default: {}}
          csvData.forEach(function (lines, i) {
            if (i > 0 && lines[index]) {
              data[key].default[lines[0]] = lines[index];
            }
          });
          files.push(tempFolder.name + '/' + fileUtils.buildTranslationFileName(options.translationFormat, null, key, options));
        }
      });

      yamlHandler.updateTranslations(data, tempFolder.name, options, () => {

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
                expect(rows[0].get(options.keyId)).to.equal(csvData[1][0]);
                expect(rows[0].get('pl # with comment')).to.equal(csvData[1][5]);
                expect(rows[0].get('default')).to.equal(csvData[1][1]);
                expect(rows[0].get('hu')).to.equal('Elfogadom'); // this was not part of the upload and should not be overwrittem
                expect(rows[1].get('default')).to.equal(csvData[2][1]);
                expect(rows[1].get('de')).to.equal(csvData[2][2]);
                expect(rows[1].get(options.keyId)).to.equal(csvData[2][0]);
                rimraf.sync(tempFolder.name);
                done()
              })
            })
          } else {
            rimraf.sync(tempFolder.name);
            done()
          }
        })
      });
    }
  },

  {
    name: 'should import updated yml keys in the test project',
    run: ['import', 'yml'],
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'messages';

      const options = {
        translationFormat: 'yml',
        fileBaseName: baseName,
        namespaceSeparator: '.',
        spreadsheetId: testSheetId_yaml,
        credentials: accessData
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
      const testFile = path.resolve(translationRoot + '/' + baseName + '.en.yml');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const yaml = require('js-yaml');
          const fs = require('fs');

          expect(fs.existsSync(testFile)).to.equal(true);

          const translations = yaml.load(fs.readFileSync(testFile, 'utf8'));

          expect(translations.add_address).to.equal("Add new address");
          expect(translations.additional.news).to.equal("Additional News");
        }
        done();
      });
    }
  },

  {
    name: 'should upload changes in the json_structure test project',
    run: ['upload', 'json_structure'],
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'messages';

      const options = {
        translationFormat: 'json_structure',
        fileBaseName: baseName,
        keyId: csvData[0][0],
        gid: 0,
        namespaceSeparator: '.',
        spreadsheetId: testSheetId,
        credentials: accessData
      }

      const files = [];

      const tempFolder = tmp.dirSync({prefix: 'trans-dyn-to-update'});
      const handler = require('../src/handlers/json_structure');
      const fileUtils = require('../src/util/file-utils');

      const data = {};

      csvData[0].forEach( function (key, index) {

        if (index > 0) {
          data[key] = {default: {}}
          csvData.forEach(function (lines, i) {
            if (i > 0 && lines[index]) {
              data[key].default[lines[0]] = lines[index];
            }
          });
          files.push(tempFolder.name + '/' + fileUtils.buildTranslationFileName(options.translationFormat, null, key, options));
        }
      });

      handler.updateTranslations(data, tempFolder.name, options, () => {

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
                expect(rows[0].get(options.keyId)).to.equal(csvData[1][0]);
                expect(rows[0].get('pl # with comment')).to.equal(csvData[1][5]);
                expect(rows[0].get('default')).to.equal(csvData[1][1]);
                expect(rows[0].get('hu')).to.equal('Elfogadom'); // this was not part of the upload and should not be overwrittem
                expect(rows[1].get('default')).to.equal(csvData[2][1]);
                expect(rows[1].get('de')).to.equal(csvData[2][2]);
                expect(rows[1].get(options.keyId)).to.equal(csvData[2][0]);
                rimraf.sync(tempFolder.name);
                done()
              })
            })
          } else {
            rimraf.sync(tempFolder.name);
            done()
          }
        })
      });
    }
  },

  {
    name: 'should import updated json_structure keys from the test project',
    run: ['import', 'json_structure'],
    fnc: function (done) {
      this.timeout(timeout);

      const baseName = 'messages';

      const options = {
        translationFormat: 'json_structure',
        fileBaseName: baseName,
        namespaceSeparator: '.',
        spreadsheetId: testSheetId_yaml,
        credentials: accessData
      };

      const translationRoot = ensureFolder(path.resolve('./test/translations/' + options.translationFormat + '/'));
      const testFile = path.resolve(translationRoot + '/' + baseName + '.en.json');

      app.importFromSpreadsheet(translationRoot, options, function (err) {
        expect(err).to.be.null

        if (!err) {
          const fs = require('fs');

          expect(fs.existsSync(testFile)).to.equal(true);

          const translations = require(testFile);

          expect(translations.add_address).to.equal("Add new address");
          expect(translations.additional.news).to.equal("Additional News");
        }
        done();
      });
    }
  },
];


// run the test
describe('Running ' + testFor + ' tests', function () {

  for (let i = 0; i < tests.length; i++) {
    const theTest = tests[i];

    if (testFor === 'all' || theTest.run.indexOf(testFor) > -1) {
      it(theTest.name, theTest.fnc);
    }
  }
});
