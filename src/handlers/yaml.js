const fs = require("fs");
const yaml = require('js-yaml');
const constraints = require("../util/constraints");
const {withoutError} = require("../helpers");

module.exports.loadTranslationFile = function (filePath, callback) {
    if (fs.existsSync(filePath)) {
        callback(yaml.load(fs.readFileSync(filePath)));
    } else {
        callback({}); // empty object, if teh file does not exist
    }
}

/**
 * A wrapper to return a flat key: value object structure, used for uploading
 * @param {string} filePath
 * @param {function} callback
 */
module.exports.getTranslationKeys = function (filePath, callback) {
    const result = {};

    const keyFlattener = function(structure, prefix) {
        prefix = prefix || '';

        Object.keys(structure).forEach((key) => {

            const subStructure = structure[key];

            if (typeof subStructure === 'object' && subStructure !== null && subStructure !== undefined) {
                keyFlattener(subStructure, prefix + key + '.');
            } else {
                result[prefix + key] = subStructure;
            }
        })

    }

    this.loadTranslationFile(filePath, (parsedObject) => {
        keyFlattener(parsedObject);
        callback(result);
    });
}


module.exports.updateTranslations = function (translationData, translationRootFolder, options, callback) {
    const path = require('path');
    const async = require('async');
    const mod = this;
    const fileUtils = require('../util/file-utils');

    if (! fs.existsSync(translationRootFolder)) {
        throw new Error('The folder ' + translationRootFolder + ' does not exist');
    }

    async.each(Object.keys(translationData), function(locale, done) {

        // is it a comment or a real translation?
        if (locale.substr(0, constraints.commentCollumnName.length) !== constraints.commentCollumnName) {

            async.each(Object.keys(translationData[locale]), function (namespace, done2) {

                const localeFileName = fileUtils.buildTranslationFileName(constraints.TRANSLATION_FORMATS.YAML, namespace, locale, options);
                const file = path.resolve(translationRootFolder + '/' + localeFileName);

                mod.loadTranslationFile(file, function (translations) {
                    const potentiallyUpdatedTranslations = translationData[locale][namespace];

                    Object.keys(potentiallyUpdatedTranslations).forEach((key) => {
                        const parts = key.split('.');
                        let tree = translations;

                        while (parts.length > 0) {
                            const part = parts.shift();

                            if (parts.length === 0) {
                                tree[part] = potentiallyUpdatedTranslations[key];
                            } else {
                                if (!tree[part]) {
                                    tree[part] = {}
                                }

                                tree = tree[part];
                            }
                        }
                    });

                    // now we write
                    fs.writeFile(file, yaml.dump(translations, {indent: 4}), function (err) {
                        if (withoutError(err)) {
                            // console.info('Updated translations of %o', localeFileName);
                        }
                        done2();
                    })
                })
            }, function () {
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