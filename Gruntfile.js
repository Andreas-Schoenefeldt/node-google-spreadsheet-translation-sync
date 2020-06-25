/*
 * grunt-translation-spreadsheet-sync
 * https://github.com/Andreas-Schoenefeldt/grunt-translation-spreadsheet-sync
 *
 * Copyright (c) 2019 Andreas Schönefeldt
 * Licensed under the MIT license.
 */

'use strict';

const semver = require('semver');

module.exports = function(grunt) {

  const pkg = grunt.file.readJSON('package.json');
  const currentVersion = pkg.version;

  // Project configuration.
  grunt.initConfig({
    pkg: pkg,

    bump: {
      options: {
        files: ['package.json'],
        commitFiles: ['-a'],
        pushTo: 'origin',
        globalReplace: true,
        // regExp: /(['|"]?version['|"]?[ ]*:[ ]*['|"]?|^framework:[\S\s]*?assets:[\s]*version:[ ]*)(\d+\.\d+\.\d+(-false\.\d+)?(-\d+)?)[\d||A-a|.|-]*(['|"]?)/gmi
      }
    },
    prompt: {
      bump: {
        options: {
          questions: [
            {
              config:  'bump.options.setVersion',
              type:    'list',
              message: 'Bump version from ' + '<%= pkg.version %>' + ' to:',
              choices: [
                {
                  value: semver.inc(currentVersion, 'patch'),
                  name:  'Patch:  ' + semver.inc(currentVersion, 'patch') + ' Backwards-compatible bug fixes.'
                },
                {
                  value: semver.inc(currentVersion, 'minor'),
                  name:  'Minor:  ' + semver.inc(currentVersion, 'minor') + ' Add functionality in a backwards-compatible manner.'
                },
                {
                  value: semver.inc(currentVersion, 'major'),
                  name:  'Major:  ' + semver.inc(currentVersion, 'major') + ' Incompatible API changes.'
                },
                {
                  value: 'custom',
                  name:  'Custom: ?.?.? Specify version...'
                }
              ]
            },
            {
              config:   'bump.options.setVersion',
              type:     'input',
              message:  'What specific version would you like',
              when:     function (answers) {
                return answers['bump.options.setVersion'] === 'custom';
              },
              validate: function (value) {
                var valid = semver.valid(value);
                return !!valid || 'Must be a valid semver, such as 1.2.3-rc1. See http://semver.org/ for more details.';
              }
            }
          ]
        }
      }
    },

    shell: {
      publish_npm: {
        command: [
            'npmrc public', // well, this is at the moment hardcoded to my personal public registry name
            'npm publish'
        ].join('&&')
      },
      merge: {
        command: [
          'git checkout develop',
          'git pull origin develop',
          'git merge master',
          'git push',
          'git checkout master' // back to master
        ].join('&&')
      }
    }

  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('build', 'Production Build', function() {
    grunt.task.run('prompt', 'bump', 'shell:publish_npm', 'shell:merge');
  });

};
