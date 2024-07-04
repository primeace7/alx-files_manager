import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(req, res) {
    // Return the status of the redis and mongodb databases
    let redisStatus; let
      dbStatus;
    try {
      redisStatus = redisClient.isAlive();
      dbStatus = await dbClient.isAlive();
    } catch (err) {}

    if (!!redisStatus && !!dbStatus) res.status(200).json({ redis: redisStatus, db: dbStatus });
    else {
      res.status(500).json({ error: 'The application is down becasue one or more database servers are out of service' });
    }
  }

  // Return stats of resources in the database i.e number of files and users
  static async getStats(req, res) {
    const nbUsers = await dbClient.nbUsers();
    const nbFiles = await dbClient.nbFiles();

    res.status(200).json({ users: nbUsers, files: nbFiles });
  }
}

export { AppController };
