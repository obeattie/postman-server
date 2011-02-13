var express = require('express'),
    app = express.createServer(),
    redis = require('redis').createClient(),
    _ = require('underscore'),
    store = require('./store');

var Agent = store.Agent;

// Parse POSTed data
app.use(express.bodyDecoder());

app.post('/send/:recipient', function(req, res){
    var recipient = req.param('recipient');
    Agent.send(recipient, req.body, function(){
        res.send({ 'status': 'ok' });
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
app.listen(80);
Agent.init();
