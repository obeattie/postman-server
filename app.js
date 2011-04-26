var express = require('express'),
    app = express.createServer(),
    redis = require('redis').createClient(),
    _ = require('underscore'),
    store = require('./store'),
    UserRegistry = require('./users').UserRegistry,
    Agent = store.Agent,
    io = require('socket.io');

// Parse POSTed data
app.use(express.bodyDecoder());

app.post('/send/', function(req, res){
    UserRegistry.verifyAuthKey(
        req.body.sender,
        req.body.clientId,
        req.body.authKey,
        // Success cb
        function(){
            var recipients = JSON.parse(req.body.recipients),
                cbCounter = 0,
                errors = []
                link = Agent.sanitize(req.body);
            
            _.each(recipients, function(recipient){
                Agent.send(recipient, link, function(err){
                    cbCounter++;
                    if (err){
                        errors.push(err);
                    }
                    // If this is the last callback, return to the client
                    if (cbCounter === recipients.length){
                        // If there were any errors, return those
                        if (errors.length){
                            res.send({ 'status': 'err', 'extra': errors });
                        } else {
                            var archivedLink = Agent.archive(link, recipients);
                            res.send({ 'status': 'ok', 'extra': { 'link': archivedLink } });
                        }
                    }
                });
            });
        },
        // Error cb (authentication key didn't match)
        function(){
            res.send({ 'status': 'err', 'extra': 'auth failure' });
        }
    );
});

app.post('/auth/', function(req, res){
    UserRegistry.setFbToken(
        req.body.uid,
        req.body.clientId,
        req.body.token,
        // Success callback
        function(localKey){
            res.send({
                'status': 'ok',
                'authKey': localKey
            });
        },
        // Error callback
        function(){
            res.send({
                'status': 'err',
                'extra': 'invalid fb token'
            });
        }
    );
});

// Socket.io
var socket = io.listen(app);
socket.on('connection', function(client){
    var sendLinkCb = function(links){
        // Callback bound to the client to send incoming links
        if (links.length < 1) return;
        console.log('transmitting', links);
        client.send(JSON.stringify({
            'status': 'ok',
            'kind': 'incoming',
            'links': links
        }));
    }
    
    client.on('message', function(data){
        console.log('socket.message:', data);
        data = JSON.parse(data);
        switch (data.method){
            case 'listen':
                UserRegistry.verifyAuthKey(
                    data.to,
                    data.clientId,
                    data.authKey,
                    // Successfully verified authentication key
                    function(){
                        Agent.listen(data.to, sendLinkCb, client.sessionId);
                    },
                    // Failure callback
                    function(){
                        client.send(JSON.stringify({
                            'status': 'err',
                            'kind': 'deauth',
                            'extra': 'auth failure'
                        }));
                    });
                break;
        }
    });
    
    client.on('disconnect', function(){
        Agent.silence(client.sessionId);
    });
});

module.exports = app;
