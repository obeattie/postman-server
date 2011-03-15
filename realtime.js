var redis = require('redis'),
    _ = require('underscore'),
    sender = redis.createClient(),
    receiver = redis.createClient();

// The reactor is responsible for sending/receiving all messages
var Reactor = {
    subscriptions: {},
    
    subscribe: function(channel, cb){
        console.log('realtime.Reactor:subscribe ', channel);
        if (!(channel in this.subscriptions)) {
            this.subscriptions[channel] = [];
            receiver.subscribe(channel);
        }
        this.subscriptions[channel].push(cb);
    },
    
    unsubscribe: function(channel, cb){
        console.log('realtime.Reactor:unsubscribe ', channel);
        this.subscriptions[channel] = (this.subscriptions[channel] || []);
        this.subscriptions[channel] = _.without(this.subscriptions[channel], cb);
    },
    
    receive: function(channel, value){
        console.log('realtime.Reactor:receive ', channel, value);
        _.each((this.subscriptions[channel] || []), function(cb){
            cb(value);
        });
    },
    
    send: function(channel, value){
        console.log('realtime.Reactor:publish ', channel, value);
        return sender.publish(channel, value);
    },
    
    listen: function(){
        receiver.on('message', this.receive);
    },
    
    silence: function(sessionId){
        console.log('realtime.Reactor:silencing ' + sessionId);
        var _sum = function(i, x){ return i + x; }
        console.log('    Before: ' + _.reduce(this.subscriptions, _sum, 0));
        _.each(this.subscriptions, function(value, key){
            this.subscriptions[key] = _.reject(value, function(cb){
                return (cb.sessionId == sessionId);
            });
        }, this);
        console.log('    After: ' + _.reduce(this.subscriptions, _sum, 0));
    }
}
_.bindAll(Reactor);

exports.Reactor = Reactor;
