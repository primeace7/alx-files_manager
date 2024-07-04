import { createClient} from "redis";
import { promisify } from "node:util";

class RedisClient {
    constructor() {
        this.redis = createClient()
        .on('error', () => this.redis = false)

        if (!!this.redis){
            this.redis.get = promisify(this.redis.get);
            this.redis.set = promisify(this.redis.setex);
            this.redis.del = promisify(this.redis.del);
        }
    }

    isAlive() {
        return this.redis.ping();
    }

    // Get the 'value' of 'key' from redisCache
    async get(key) {
        return this.redis.get(key)
        .then(result => result);
    }

    // Set the 'value' of 'key' for 'duration' seconds in redisCache'
    async set(key, value, duration) { 
        return this.redis.setex(key, duration, value);
    }

    // Delete the 'value' of 'key' from redisCache
    async del (key) {
        return this.redis.del(key)
        .then(msg => null);
    }
}
const redisClient = new RedisClient();
export default redisClient;