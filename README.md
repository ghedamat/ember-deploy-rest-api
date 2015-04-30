# Ember-deploy-rest-api

This is the adapter implementation to use
[ember-deploy](https://github.com/levelbossmike/ember-deploy) with a JSON REST API.

# Configuration

In your _deploy.js_ add the following:

    store: {
      type: 'rest-api',
      authHeader: 'Token 123', // optional, will be added to all api calls
      baseUrl: 'http://www.example.com/assets/' // url of the api
    }

# API

The api is expected to work like this:

## Create a revision

    PUT /:asset-key/revisions/:revision-key {"value": "html body of the revision"}

Returns 204 code and empty response.

## Activate a revision

    PUT :/asset-key {"revision": "<revision key>"}

Returns 204 code and empty response.

## List revisions

    GET /:asset-key/revisions

Returns JSON:

    ['version1', 'version2']
