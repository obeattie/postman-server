var redis = require('redis').createClient(),
    _ = require('underscore'),
    uuid = require('node-uuid');

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
        // Sets the Facebook authentication token, and returns a UUID which
        // will be used to verify the uid with the client whenever subsequent
        // requests are made (a sorta-kinda ghetto-fab pubkey)
        console.log('Recording FB token: ' + token);
        var localToken = uuid();
        redis.set((this._getKey(username) + ':fbToken'), token);
        redis.set((this._getKey(username) + ':authKey'), localToken);
        return localToken;
    },
    
    verifyAuthKey: function(username, key, cb, errCb){
        // Verifies the passed authentication token as being equal to that being
        // held locally for the username. The callback is called only if the
        // key matches (if an errorCb is passed this will be called in the case
        // of no match instead)
        redis.get((this._getKey(username) + ':authKey'), function(err, actualKey){
            if (key === actualKey){
                cb();
            } else if (errCb !== undefined) {
                console.warn('User auth key mismatch: ' + username + ', ' + key);
                errCb();
            }
        });
    }
}

_.bindAll(UserRegistry);
exports.UserRegistry = UserRegistry;
