var cluster = require('cluster'),
    exception = require('cluster.exception'),
    app = require('./app');

cluster('./app')
    .use(cluster.logger('/var/log/postman-server'))
    .use(cluster.stats())
    .use(cluster.pidfiles('pids'))
    .use(cluster.cli())
    .use(cluster.repl(666))
    .use(exception({to: 'webmaster@emberb0x.com'}))
    .listen(8080);
