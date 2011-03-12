var express = require('express'),
    app = express.createServer(),
    redis = require('redis').createClient(),
    _ = require('underscore'),
    store = require('./store'),
    Agent = store.Agent,
    io = require('socket.io');

// Parse POSTed data
app.use(express.bodyDecoder());

app.post('/send/', function(req, res){
    var recipients = JSON.parse(req.body.recipients),
        cbCounter = 0,
        errors = [];
    _.each(recipients, function(recipient){
        Agent.send(recipient, req.body, function(err){
            cbCounter++;
            if (err){
                errors.push(err);
            }
            // If this is the last callback, return to the client
            if (cbCounter === recipients.length){
                // If there were any errors, return those
                if (errors){
                    res.send({ 'status': 'err', 'extra': errors });
                } else {
                    res.send({ 'status': 'ok' });
                }
            }
        });
    });
});

app.get('/check/:recipient', function(req, res){
    var recipient = req.param('recipient');
    Agent.check(recipient, function(links){
        res.send({
            'status': 'ok',
            'links': links
        });
    });
});

app.get('/listen/:recipient', function(req, res){
    var recipient = req.param('recipient');
    Agent.listen(recipient, function(links){
        res.send({
            'status': 'ok',
            'links': links
        });
    });
});

// Listen on 80
app.listen(8080);
Agent.init();

// Socket.io
var socket = io.listen(app);
socket.on('connection', function(client){
    var sendLinkCb = function(links){
        if (links.length < 1) return;
        console.log('transmitting', links);
        client.send(JSON.stringify({
            'status': 'ok',
            'links': links
        }));
    }
    sendLinkCb.sessionId = client.sessionId;
    
    client.on('message', function(data){
        data = JSON.parse(data);
        if (data.method == 'listen'){
            Agent.listen(data.to, sendLinkCb);
        }
    });
    
    client.on('disconnect', function(){
        Agent.silence(sendLinkCb);
    });
});
