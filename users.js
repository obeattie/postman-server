var redis = require('redis').createClient(),
    _ = require('underscore'),
    uuid = require('node-uuid'),
    rest = require('restler');

var UserRegistry = {
    _getKey: function(username, clientId){
        var key = ('user:' + username);
        if (clientId){
            key = (key + ':client:' + clientId);
        }
        return key;
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
    
    setFbToken: function(username, clientId, token, cb, errCb){
        // Sets the Facebook authentication token, and calls back with a UUID
        // to be used to verify the uid with the client whenever subsequent
        // requests are made (a sorta-kinda ghetto-fab pubkey) -- after verifying
        // the Facebook authentication token
        console.log('Recording FB token: ' + token + ', client: ' + clientId);
        var localToken = uuid();
        rest.get('https://graph.facebook.com/me', {
            'query': {
                'access_token': token
            }
        }).on('complete', _.bind(function(data){
            data = JSON.parse(data);
            if (data.id == username){
                redis.set((this._getKey(username, clientId) + ':fbToken'), token);
                redis.set((this._getKey(username, clientId) + ':authKey'), localToken);
                cb(localToken);
            } else {
                console.warn('Invalid fb auth token passed: ' + username + ', ' + token);
                if (errCb) {
                    errCb();
                }
            }
        }, this));
    },
    
    verifyAuthKey: function(username, clientId, key, cb, errCb){
        // Verifies the passed authentication token as being equal to that being
        // held locally for the username. The callback is called only if the
        // key matches (if an errorCb is passed this will be called in the case
        // of no match instead)
        redis.get((this._getKey(username, clientId) + ':authKey'), function(err, actualKey){
            if (key === actualKey){
                cb();
            } else if (errCb !== undefined) {
                console.warn('User auth key mismatch: ' + username + ', ' + key + ', ' + clientId);
                errCb();
            }
        });
    }
}

_.bindAll(UserRegistry);
exports.UserRegistry = UserRegistry;
