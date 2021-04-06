# node-google-spreadsheet-translation-sync

[![Build Status](https://travis-ci.org/Andreas-Schoenefeldt/node-google-spreadsheet-translation-sync.svg?branch=master)](https://travis-ci.org/Andreas-Schoenefeldt/node-google-spreadsheet-translation-sync)

> WARNING: This relies at the moment on a php script to parse the translation files. It was just more easy, to start off with my existing utilities. Please open a issue on github, if you want to give it a try, then I migrate.
>
> So long I'll just happy use it as it is for myself :) 

A plugin to read and write i18n translations from and to google spreadsheets

## Installation

  `npm install google-spreadsheet-translation-sync`

## Usage

```js
const gsTransSync = require('google-spreadsheet-translation-sync');

// export to a spreadsheet
gsTransSync.exportToSpreadsheet(['de.json', 'en.json'], options, callback);

// or import from a spreadsheet
gsTransSync.importFromSpreadsheet('your/folder', { spreadsheetId: 'xxxxxxx'}, function () {
    // done :)
});

```
    
### Options   

#### options.credentials
Type: `Object`    
Default value: `Credentials for service@seismic-hexagon-171311.iam.gserviceaccount.com`

In order to authenticate to a google spreadsheet, you need a [google drive api client](https://console.developers.google.com).
 
If you trust me enough, you could also grant read/write access to your translation spreadsheet the the default service email `service@seismic-hexagon-171311.iam.gserviceaccount.com`. Please note, that this will make you dependent on any changes that google or myself do to this service, it is recommended to use your own credentials.

The object needs to have this structure: 

```javascript
{
  "comment": "This is added by me, put here some info for yourself, to remind you what this is actually about, if you like ;)",

  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "never to be shared",
  "client_email": "e.g.: service@seismic-hexagon-171311.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

#### options.defaultLocaleName
Type: `String`   
Default value: 'default'

If no locale is provided or could be parsed, the defaultLocaleName is used instead.

#### options.fileBaseName
Type: `String`    
Default value: (empty string)    

If set, the translation files will be changed to `<fileNaseName>-<lang code>_<country code>`, for example `myplugin-de_AT`.

#### options.mode
Type: `Enum`    
Default value: `null`

Put `import`, if you want to sync from google spreadsheet to your project or put `upload` if it should go the other way around.

#### options.namespaces
Type: `Boolean`    
Default value: `false`

If multiple base filenames are used in a project, this can be turned on, to still have the properties uploaded to one spreadsheet. It will expect the first collumn of the sheet to be filled with the namespace. 

#### options.namespaceSeparator
Type: `String`    
Default value: '-'

If `namespaces` or `fileBaseName` is used, this is the separating character. For example the first `_` in `messages_en_US.json`.   

#### options.translationFormat
Type: `Enum`   
Possible Values: 
* `locale_json` (translations are stored in simple key/value json files)
* `gettext` (utilizes [node gettext-parser](https://github.com/smhg/gettext-parser) for the work with po and mo files)
* `properties` (utilizes [propertie-reader](https://github.com/steveukx/properties) for java property files)      
Default value: `locale_json`

Please feel free to create a PR or open an issue, if you need an additional translation format.

#### options.spreadsheetId
Type: `String`   
Default value: `null`

This is absolutely required to make it work  


## Tests

  `npm test`

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.
