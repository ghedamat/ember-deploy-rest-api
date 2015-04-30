/* jshint node: true */
'use strict';

var ApiAdapter = require('./lib/adapter');

module.exports = {
  name: 'ember-deploy-rest-api',
  type: 'ember-deploy-addon',

  adapters: {
    index: {
      'rest-api': ApiAdapter
    }
  }
};
