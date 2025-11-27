/**
 * @param {string[]} translationFiles - an array of files
 * @param {{translationFormat: string, mode: string, spreadsheetId: string, gid : string, credentials: {}, keyId: string, fileBaseName: string, namespaces: boolean, defaultLocaleName: string}} options
 * @param {function} callback
 */

module.exports = async function () {
    const async= require('async')
    const path = require('path');
    const prompts = require('@inquirer/prompts');
    const fs = require('fs');

    const options = {
        keyId: 'key',
        gid: '0',
        credentials: require('../test/data/access'),
        fileBaseName: '',
        namespaces: false,
        translationFormat: 'locale_json',
        defaultLocaleName: 'default',
        namespaceSeparator: '-'
    }

    const TRANSLATION_FORMATS = require('./util/constraints').TRANSLATION_FORMATS

    options.translationFormat = await prompts.select({
        message: 'Select the translation format of your project',
        choices: Object.values(TRANSLATION_FORMATS).map((format) => {
            return {value: format};
        })
    });

    const h = require('./handler');
    const handler = h.getHandler(options.translationFormat);

    if (options.translationFormat === TRANSLATION_FORMATS.PROPERTIES) {
        options.namespaces = true;
        options.namespaceSeparator = await prompts.input({
            message: 'Please set the namespace separator',
            default: options.namespaceSeparator
        });
    }

    // get all the files
    const folder = await prompts.input({
        message: 'Folder of your translation files (relative to ' + process.cwd() + ')'
    });

    const files = fs.readdirSync(folder).map(file => {
        return path.resolve(folder, file);
    });

    let data = {};

    async.each(files, function (file, cb) {

        const extension = path.extname(file);
        const fileName = path.basename(file, extension);
        let namespace = '';
        let localeKey;

        // namespace based parsing required?
        if (options.namespaces) {
            const regex = /^(\w*?)([\-_])([\w\-]{2,5})$/gi
            const matches = regex.exec(fileName);

            if (!matches) {
                // we assume, that the whole filename is the namespace
                localeKey = options.defaultLocaleName ? options.defaultLocaleName : 'default'
                namespace = fileName;
            } else {
                namespace = matches[1];
                localeKey = matches[3];
            }

            if (!data[namespace]) {
                data[namespace] = {};
            }

        } else {
            localeKey = fileName.substring(options.fileBaseName.length + (options.namespaceSeparator ? options.namespaceSeparator.length : 0));
        }

        handler.getTranslationKeys(file, function (tData) {
            if (options.namespaces) {
                data[namespace][localeKey] = tData;
            } else {
                data[localeKey] = tData;
            }

            cb();
        });
    }, async (err) => {

        switch (await prompts.select({
            message: 'What would you like to do?',
            choices: [
                {value: 'export_key', name: "Export a single key"}
            ]
        })) {
            case 'export_key':

                const key = await prompts.input({
                    message: 'Which key?'
                });
                let namespace = '';

                if (options.namespaces) {
                    namespace = await prompts.select({
                        message: 'From which namespace?',
                        choices: Object.keys(data).map(value => {
                            return {value}
                        })
                    });

                    data = data[namespace];
                }


                const head = ['key'];
                const line = [key];

                Object.keys(data).forEach(locale => {
                    if (data[locale][key]) {
                        head.push(locale);
                        line.push(data[locale][key] || '')
                    }
                })
// default export as Jira MD for now
                console.log(`||${head.join('||')}||
|${line.join('|').replace(/\{/gim, '\\{').replace(/}/gim, '\\}')}|`)

                break;
        }



    })



}