var redis = require('redis'),
    _ = require('underscore'),
    sender = redis.createClient(),
    receiver = redis.createClient();

// The reactor is responsible for sending/receiving all messages
var Reactor = {
    subscriptions: {},
    
    subscribe: function(channel, cb){
        console.log('subscribe', channel);
        if (!_.include(this.subscriptions, channel)) {
            this.subscriptions[channel] = [];
            receiver.subscribe(channel);
        }
        this.subscriptions[channel].push(cb);
    },
    
    receive: function(channel, value){
        console.log('receive', channel, value);
        _.each((this.subscriptions[channel] || []), function(cb){
            cb(value);
        });
    },
    
    send: function(channel, value){
        console.log('publish', channel, value);
        sender.publish(channel, value);
    },
    
    listen: function(){
        receiver.on('message', this.receive);
    }
}
_.bindAll(Reactor);

exports.Reactor = Reactor;
