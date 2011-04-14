var redis = require('redis').createClient(),
    _ = require('underscore');

var UserRegistry = {
    _getKey: function(username){
        return ('user:' + username);
    },
    
    exists: function(username, cb){
        console.log('checking user exists: ' + username);
        // Asynchronous: returns boolean whether the specified username exists
        // (a simple proxy to a Redis call in reality)
        redis.exists(this._getKey(username), cb);
    },
    
    register: function(username){
        // Registers the specified username
        console.log('Registering username: ' + username);
        redis.setnx(this._getKey(username), (new Date()).getTime());
    },
    
    deregister: function(username){
        // Deregisters the specified username
        console.log('Deregistering username: ' + username);
        redis.del(this._getKey(username));
    },
    
    setFbToken: function(username, token){
        console.log('Recording FB token: ' + token);
        redis.set((this._getKey(username) + ':fbToken'), token);
    }
}

_.bindAll(UserRegistry);
exports.UserRegistry = UserRegistry;
