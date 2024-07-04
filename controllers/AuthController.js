import Buffer from 'node:buffer';
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    // Check for base64-encoded authorization header
    let b64String;
    try {
      b64String = req.get('Authorization').split(' ')[1];
    } catch (TypeError) {
      res.status(401).json({ error: 'Unauthenticated user' });
      return;
    }

    const authArray = Buffer.atob(b64String).split(':');
    const [email, password] = authArray;
    const user = await dbClient.db.collection('users').findOne({ email, password: sha1(password) });

    // Deny access if no user is found with the provided credentials
    if (!user || !Object.keys(user).length) res.status(401).json({ error: 'Unauthenticated user' });
    else {
      const uuid = uuidv4();
      // Set the the authentication token to expire after 24 hours in redisCache
      await redisClient.set(`auth_${uuid}`, user._id.toString(), 86400);
      res.status(200).json({ token: uuid });
    }
  }

  static async getDisconnect(req, res) {
    // Check for authorization token in request header
    let token;
    try {
      token = req.get('X-Token');
    } catch (TypeError) {
      res.status(401).json({ error: 'Unauthorized user' });
      return;
    }

    // Get user id from redisCache
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      res.status(204).send();
      return;
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    // Deny access if no user is found with the provided credentials
    if (!user || !Object.keys(user).length) res.status(401).json({ error: 'Unauthenticated user' });
    else {
      // Delete user credentials from redisCache
      await redisClient.del(`auth_${token}`);
      res.status(204).send();
    }
  }
}

export { AuthController };
