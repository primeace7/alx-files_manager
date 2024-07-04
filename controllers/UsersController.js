import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    // Check if user supplied email
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    // Check if user supplied password
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    // Check if email already exists in database
    let result = await dbClient.db.collection('users').findOne({ email });
    if (result) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash user password and store in database
    const hashedPassword = sha1(password);
    const createdAt = new Date().toUTCString();
    result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword, createdAt });

    // Return user email and id in database
    res.status(201).json({ id: result.insertedId, email, createdAt });
  }

  static async getMe(req, res) {
    // Check for authorization token in request header
    const token = req.get('X-Token');

    // Get user id from redisCache
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized user' });
      return;
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    // Deny access if no user is found with the provided credentials
    if (!user || !Object.keys(user).length) res.status(401).json({ error: 'Unauthorized user' });
    else {
      res.json({ id: user._id, email: user.email, createdAt: user.createdAt });
    }
  }

  static async deleteUser(req, res) {
    // Check for authorization token in request header
    let token;
    try {
      token = req.get('X-Token');
    } catch (err) {
      return res.status(400).json({ error: 'No auth token provided' });
    }

    // Get user id from redisCache
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    // Delete user and all associated files, and session id
    try {
      await dbClient.db.collection('files').deleteMany({ userId: ObjectId(userId) });
      await dbClient.db.collection('users').deleteOne({ _id: ObjectId(userId) });
      await redisClient.del(`auth_${token}`);
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: 'Could not delete user and/or associated files' });
    }
  }
}

export { UsersController };
