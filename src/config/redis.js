const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

const pubClient = new Redis(redisConfig);
const subClient = new Redis(redisConfig);

pubClient.on('error', (err) => logger.error('Redis Pub Client Error', err));
subClient.on('error', (err) => logger.error('Redis Sub Client Error', err));

module.exports = { pubClient, subClient };
