import { MongoNetworkError } from "mongodb/lib/core";
import MongoClient from "mongodb/lib/mongo_client";

class DBClient {
    host = process.env.DB_HOST || 'localhost';
    port = process.env.DB_PORT || '27017';
    database = process.env.DB_DATABASE || 'files_manager';
    uri = `mongodb://${this.host}:${this.port}/${this.database}`;

    constructor() {
        this.connectDB(this.uri);
    }

    async connectDB(uri) {
        const client = new MongoClient(this.uri, { useUnifiedTopology: true });
        await client.connect();
        this.db = await client.db();
    }

    async isAlive() {
        return await this.db.command({ping: 1})
        .then(res => !!res.ok);
    }

    async nbUsers(){
        return await this.db.collection('users').find().count();
    }

    async nbFiles() {
        return await this.db.collection('files').find().count();
    }
}
const dbClient = new DBClient();
export default dbClient;