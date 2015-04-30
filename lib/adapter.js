/* jshint node: true */

var CoreObject  = require('core-object');
var RSVP        = require('rsvp');
var chalk       = require('chalk');
var Promise     = require('ember-cli/lib/ext/promise');
var SilentError = require('ember-cli/lib/errors/silent');
var request = require('request');
var extend = require('util')._extend;

var green = chalk.green;
var white = chalk.white;

module.exports = CoreObject.extend({
  init: function() {
    if (!this.config) {
      return Promise.reject(new SilentError('You have to pass a config!'));
    }

    var requestOptions = {
      headers: {Authorization: this.config.authHeader},
      followAllRedirects: true,
      json: true,
    };
    var baseUrl = this.config.baseUrl;
    this.client = {
      get: function(key) {
        return new RSVP.Promise(function(resolve, reject) {
          request.get(extend(requestOptions, {
            url: baseUrl + key
          }), function(error, response, body) {
            if(error) {
              reject(error);
            } else {
              resolve(body['revision']);
            }
          });
        });
      },
      add: function(assetKey, versionKey, value) {
        return new RSVP.Promise(function(resolve, reject) {
          request
            .put(extend(requestOptions, {
              url: baseUrl + assetKey + '/revisions/' + versionKey,
              body: {value: value}
            }), function(error, response, body) {
              if(error) {
                reject(error);
              } else {
                resolve(body);
              }
            });
        });
      },
      versions: function(key) {
        return new RSVP.Promise(function(resolve, reject) {
          request
            .get(extend(requestOptions, {
              url: baseUrl + key + '/revisions'
            }), function(error, response, body) {
              if(error) {
                reject(error);
              } else {
                resolve(body);
              }
            });
        });
      },
      activate: function(key, version) {
        return new RSVP.Promise(function(resolve, reject) {
          request
            .put(extend(requestOptions, {
              url: baseUrl + key,
              body: {revision: version}
            }), function(error) {
              if(error) {
                reject(error);
              } else {
                resolve();
              }
            });
        });
      }
    };
  },

  upload: function(value) {
    var key            = this.taggingAdapter.createTag();

    return this._upload(value, key);
  },

  list: function() {
    return RSVP.hash({
      revisions: this._list(),
      current: this._current()
    })
    .then(function(results) {
      var revisions = results.revisions;
      var current   = results.current;
      var message   = this._revisionListMessage(revisions, current);

      this._printSuccessMessage(message);

      return message;
    }.bind(this));
  },

  activate: function(revisionKey) {
    if (!revisionKey) {
      return this._printErrorMessage(this._noRevisionPassedMessage());
    }

    var that      = this;

    return new RSVP.Promise(function(resolve, reject) {
      return that.client.activate(that.manifest, revisionKey)
        .then(resolve);
    })
    .then(this._activationSuccessfulMessage)
    .then(this._printSuccessMessage.bind(this))
    .catch(function() {
      return this._printErrorMessage(this._revisionNotFoundMessage());
    }.bind(this));
  },

  _list: function() {
    return this.client.versions(this.manifest);
  },

  _current: function() {
    return this.client.get(this.manifest);
  },

  _initTaggingAdapter: function() {
    var TaggingAdapter = require('../tagging/'+this.tagging);

    return new TaggingAdapter({
      manifest: this.manifest
    });
  },

  _upload: function(value, key) {
    return this._doUpload(value, key)
      .then(this.activate.bind(this, key))
      .then(this._deploySuccessMessage.bind(this, key))
      .then(this._printSuccessMessage.bind(this))
      .then(function() { return key; })
      .catch(function() {
        var message = this._deployErrorMessage();
        return this._printErrorMessage(message);
      }.bind(this));
  },

  _doUpload: function(value, key) {
    var that = this;

    return new RSVP.Promise(function(resolve, reject) {
      return that.client.add(that.manifest, key, value.toString('utf-8')).then(resolve);
    });
  },

  _printSuccessMessage: function(message) {
    return this.ui.writeLine(message);
  },

  _printErrorMessage: function(message) {
    return Promise.reject(new SilentError(message));
  },

  _deploySuccessMessage: function(revisionKey) {
    var success       = green('\nUpload successful!\n\n');
    var uploadMessage = white('Uploaded revision: ')+green(revisionKey);

    return success + uploadMessage;
  },

  _deployErrorMessage: function() {
    var failure    = '\nUpload failed!\n';
    var suggestion = 'Did you try to upload an already uploaded revision?\n\n';
    var solution   = 'Please run `'+green('ember deploy:list')+'` to ' +
                     'investigate.';

    return failure + '\n' + white(suggestion) + white(solution);
  },

  _noRevisionPassedMessage: function() {
    var err = '\nError! Please pass a revision to `deploy:activate`.\n\n';

    return err + white(this._revisionSuggestion());
  },

  _activationSuccessfulMessage: function() {
    var success = green('\nActivation successful!\n\n');
    var message = white('Please run `'+green('ember deploy:list')+'` to see '+
                        'what revision is current.');

    return success + message;
  },

  _revisionNotFoundMessage: function() {
    var err = '\nError! Passed revision could not be found in manifest!\n\n';

    return err + white(this._revisionSuggestion());
  },

  _revisionSuggestion: function() {
    var suggestion = 'Try to run `'+green('ember deploy:list')+'` '+
                     'and pass a revision listed there to `' +
                     green('ember deploy:activate')+'`.\n\nExample: \n\n'+
                     'ember deploy:activate --revision <manifest>:<sha>';

    return suggestion;
  },

  _revisionListMessage: function(revisions, currentRevision) {
    var headline      = '\nLast uploaded revisions:\n\n';
    var footer        = '\n\n# => - current revision';
    var revisionsList = revisions.reduce(function(prev, curr) {
      var prefix = (curr === currentRevision) ? '| => ' : '|    ';
      return prev + prefix + chalk.green(curr) + '\n';
    }, '');

    return headline + revisionsList + footer;
  }
});
