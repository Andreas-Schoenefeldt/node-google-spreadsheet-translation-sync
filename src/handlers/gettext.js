'use strict'

const fs = require('fs');
const withoutError = require('../helpers').withoutError
const gettextParser = require("gettext-parser");
const constraints = require('../util/constraints');


module.exports.loadTranslationFile = function (filePath, callback) {

  fs.access(filePath, function (err) {

    if (err) {
      callback({}); // we return the empty json
    } else {

      fs.readFile(filePath, function (err, data) {

        if (err) {
          callback({});
        } else {
          callback(gettextParser.po.parse(data));
        }
      })
    }
  });

}


module.exports.updateTranslations = function (translationData, translationRootFolder, callback) {
  const path = require('path');
  const async = require('async');
  const mod = this;

  if (! fs.existsSync(translationRootFolder)) {
    throw new Error('The folder ' + translationRootFolder + ' does not exist');
  }

  // console.log(translationData);

  async.each(Object.keys(translationData), function(locale, done) {

    // is it a comment or a real translation?
    if (locale !== constraints.commentCollumnName) {

      const localeFileName = locale + '.po';
      const file = path.resolve(translationRootFolder + '/' + localeFileName);
      const moFile = path.resolve(translationRootFolder + '/' + locale + '.mo');

      mod.loadTranslationFile(file, function (parsedObj) {

        // do we have a file?
        if (!parsedObj.translations) {
          parsedObj = {
            "charset": "UTF-8",

            "headers": {
              "content-type": "text/plain; charset=UTF-8",
              "plural-forms": "nplurals=2; plural=(n!=1);",
              "X-Generator" : "node-google-spreadsheet-translation-update",
              "Language" : locale
            },

            "translations": {
              "": {
              }
            }
          }
        }

        const potentiallyUpdatedTranslations = translationData[locale];

        // update our object
        Object.keys(potentiallyUpdatedTranslations).forEach(function (key, index) {
          if (!parsedObj.translations[''][key]) {
            parsedObj.translations[''][key] = {
              "msgid": key,
              "msgstr": [],
              "comments": {}
            }
          }

          parsedObj.translations[''][key].msgstr[0] = potentiallyUpdatedTranslations[key];

          // do we have a comment?
          if (translationData[constraints.commentCollumnName] && translationData[constraints.commentCollumnName][key]) {
            if (!parsedObj.translations[''][key].comments) {
              parsedObj.translations[''][key].comments = {};
            }

            parsedObj.translations[''][key].comments.translator = translationData[constraints.commentCollumnName][key];
          }
        });

        // now we write

        const output = gettextParser.po.compile(parsedObj, {sort: true});
        fs.writeFileSync(file, output);

        const mo = gettextParser.mo.compile(parsedObj);
        fs.writeFileSync(moFile, mo);

        console.info('Updated translations of %o', localeFileName);

        done();
      })
    } else {
      done();
    }
  }, function (err) {
    if (withoutError(err, callback)) {
      callback(null);
    }
  });


}