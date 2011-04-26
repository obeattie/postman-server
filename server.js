var cluster = require('cluster'),
    exception = require('cluster.exception'),
    app = require('./app');

cluster('./app')
    .use(cluster.logger('/var/log/postman-server.dev'))
    .use(cluster.stats())
    .use(cluster.pidfiles('/var/run/node.dev'))
    .use(cluster.cli())
    .use(exception({to: 'webmaster@emberb0x.com'}))
    .listen(8088);
