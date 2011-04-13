/* ---------
   Implements a consistent API for sending/receiving links to/from clients,
   abstracting away splitting between sending to a queue and sending via the
   realtime processes.
   ----------
*/

var realtime = require('./realtime'),
    users = require('./users'),
    redis = require('redis').createClient(),
    _ = require('underscore'),
    assert = require('assert'),
    uuid = require('node-uuid');

var urlRe = /https?:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
var Reactor = realtime.Reactor;

// Template settings
_.templateSettings = {
    'interpolate': /\{\{(.+?)\}\}/g,
    'evaluate': /\{\%(.+?)\%\}/g
};
var keyTemplates = {
    'recipientLinks': 'links:for:{{ recipient }}',
    'archivedLinks': 'links:archived:{{ id }}'
}

var DeliveryAgent = {
    sanitize: function(item){
        // Validates and sanitizes a link object (and gives it an id)
        var result = {
            'id': uuid(),
            'url': item.url,
            'title': item.title,
            'favicon': (item.favicon || null),
            'sender': item.sender,
            'timestamp': (new Date().getTime())
        }
        // ...check the URLs are really URLs
        assert.ok(result.url, 'url undefined');
        assert.ok(result.url.match(urlRe), 'url regex mismatch');
        assert.ok((!result.favicon || result.favicon.match(urlRe)), 'favicon regex mismatch');
        // And that title and sender are present (I know they're not really
        // going to be undefined, but hey)
        assert.ok(result.title, 'title undefined');
        assert.ok(result.sender, 'sender undefined');
        // Everything passed
        return result;
    },
    
    _getKey: function(recipient){
        return _.template(keyTemplates.recipientLinks, {
            recipient: recipient
        });
    },
    
    _toArray: function(){
        return _.toArray(arguments);
    },
    
    init: function(){
        console.log('store.DeliveryAgent.init');
        Reactor.listen();
    },
    
    send: function(recipient, item, cb){
        console.log('store.DeliveryAgent.send:', recipient);
        users.UserRegistry.exists(recipient, _.bind(function(foo, userExists){
            if (!userExists){
                return cb('user:unknown:' + recipient);
            } else {
                var key = this._getKey(recipient);
                item = JSON.stringify(item);
                Reactor.send(key, item);
                redis.rpush(key, item, cb);
            }
        }, this));
    },
    
    archive: function(link, recipients){
        // Marks a link as having been sent (basically archives it permanently
        // in Redis should we ever need it for anything [this is not currently
        // used for anything but could be very handy for analytics etc]).
        //
        // Returns the link in archived form (currently, this includes the recipients
        // list only, but again, more may be added)
        console.log('store.DeliveryAgent:recordSent:', link, recipients);
        var storageKey = _.template(keyTemplates.archivedLinks, link);
        // Add the recipients to the link, and stringify it
        link.recipients = recipients;
        redis.set(storageKey, JSON.stringify(link));
        return link;
    },
    
    depersist: function(recipient, rawItem){
        // Removes the passed item fom the persistant store. Returns the
        // removed item (the passed value) as to be chainable
        console.log('store.DeliveryAgent.depersist:', recipient);
        var key = this._getKey(recipient);
        redis.lrem(key, 0, rawItem);
        return rawItem;
    },
    
    listen: function(recipient, cb, sessionId){
        console.log('store.DeliveryAgent.listen:', sessionId);
        users.UserRegistry.register(recipient); // Register in the user registry
        var key = this._getKey(recipient);
        // Depersist needs to be passed recipient as an argument
        var depersist = _.bind(this.depersist, this, recipient);
        // Callback needs to be wrapped in a few things, and the session id
        // preserved as an attribute
        cb = _.compose(cb, this._toArray, JSON.parse, depersist);
        cb.sessionId = sessionId;
        Reactor.subscribe(key, cb);
        // Now call check and pass any of its results back too (to catch any
        // links sent while no client was connected)
        this.check(recipient, cb);
    },
    
    silence: Reactor.silence, // Simple proxy
    
    check: function(recipient, cb){
        console.log('store.DeliveryAgent.check:', recipient);
        var key = this._getKey(recipient);
        redis.lrange(key, 0, -1, function(err, result){
            _.each((result || []), cb);
        });
    }
}

// Bind and export the agent
_.bindAll(DeliveryAgent);
exports.Agent = DeliveryAgent;
