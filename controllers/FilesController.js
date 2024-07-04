import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, readFile } from 'node:fs';
import { promisify } from 'node:util';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const mime = require('mime-types');
const Bull = require('bull');
const { unlink } = require('node:fs');

const fileQueue = new Bull('fileQueue');
const read = promisify(readFile);

class FilesController {
  // get a user from database using auth token in request header
  static async getUser(req, res) {
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
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    // Deny access if no user is found with the provided credentials
    if (!user || !Object.keys(user).length) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }

    return user;
  }

  // Upload a post
  static async postUpload(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    let name; let type; let parentId; let isPublic; let data; let
      parent;
    try {
      [name, type, parentId, isPublic, data] = [
        req.body.name,
        req.body.type,
        req.body.parentId || 0,
        req.body.isPublic || false,
        req.body.data,
      ];
    } catch (err) {
      res.status(400).json({ error: 'There was a problem with the provided data' });
      return;
    }

    // Validate the input resources needed to create a file, folder, or image
    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    } if (!['folder', 'file', 'image'].includes(type)) {
      res.status(400).json({ error: 'Missing type' });
      return;
    } if (!data && type !== 'folder') {
      res.status(400).json({ error: 'Missing data' });
      return;
    } if (parentId) {
      try {
        parent = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      } catch (err) {
        if (err.message.includes('Argument passed in must be a single String of 12 bytes')) parent = false;
      }

      // Check if the parent folder specified by the user exists in database
      if (!parent || !Object.keys(parent).keys()) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      } if (parent.type !== 'folder') { // Check if parent is actually a folder
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    // Construct file object to be saved as document in database
    const file = {
      name, type, parentId, isPublic, userId: user._id,
    };
    file.createdAt = new Date().toUTCString();
    file.updatedAt = file.createdAt;

    // Save file to database as folder
    if (type === 'folder') {
      const newFile = await dbClient.db.collection('files').insertOne(file);
      delete file._id;
      file.id = newFile.insertedId;
      res.status(201).json(file);
    } else { // Save file to database as image or file
      const path = process.env.FOLDER_PATH || '/tmp/files_manager';
      const filePath = `${path}/${uuidv4()}`;
      const fileBuffer = Buffer.from(data, 'base64');

      // Create storage directory (/tmp/files_manager) if it doesn't already exist
      mkdirSync(path, { recursive: true });

      writeFileSync(filePath, fileBuffer);
      file.localPath = filePath;
      const newFile = await dbClient.db.collection('files').insertOne(file);

      // Add new background job to create thumbnails for image files
      if (type === 'image') fileQueue.add({ userId: String(user._id), fileId: newFile.insertedId });

      // Remove the file's local path on server from file object before returning to user
      delete file.localPath;
      delete file._id;
      file.id = newFile.insertedId;
      res.status(201).json(file);
    }
  }

  // Get all of a user's files
  static async getIndex(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    const queryData = req.query;
    const [parentId, page] = [queryData.parentId || 0, queryData.page || 0];

    const query = { userId: ObjectId(user._id), parentId };
    const result = [];

    const docs = await dbClient.db.collection('files').find(query, { projection: { localPath: 0, } }).skip(page * 20).limit(20)
      .forEach(elem => {
        elem.id = elem._id;
        delete elem._id;
        result.push(elem);
      });
    res.json(result);
  }

  // Get a specific file metadata based on the id
  static async getShow(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    let documentId;
    try {
      documentId = req.params.id;
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    const doc = await dbClient.db.collection('files').findOne({ _id: ObjectId(documentId), userId: ObjectId(user._id) });

    if (!doc || !Object.keys(doc).length) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json(doc);
    }
  }

  // Publish a file to make it public
  static async putPublish(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    const fileId = req.params.id;
    const update = await dbClient.db.collection('files').updateOne({ userId: ObjectId(user._id), _id: ObjectId(fileId) }, { $set: { isPublic: true, updatedAt: new Date().toUTCString() } });
    if (!update.matchedCount) {
      res.status(404).json({ error: 'Not found' });
    } else {
      const updatedFile = await dbClient.db.collection('files').findOne({ userId: ObjectId(user._id), _id: ObjectId(fileId) });
      try {
        await dbClient.db.collection('files').updateOne({ _id: ObjectId(updatedFile.parentId) }, { $set: { updatedAt: new Date().toUTCString() } });
      } catch (err) { return; }
      updatedFile.id = updatedFile._id;
      delete updatedFile._id;
      delete updatedFile.localPath;
      res.json(updatedFile);
    }
  }

  // Unpublish a file to make it private
  static async putUnpublish(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    const fileId = req.params.id;
    const update = await dbClient.db.collection('files').updateOne({ userId: ObjectId(user._id), _id: ObjectId(fileId) }, { $set: { isPublic: false, updatedAt: new Date().toUTCString() } });
    if (!update.matchedCount) {
      res.status(404).json({ error: 'Not found' });
    } else {
      const updatedFile = await dbClient.db.collection('files').findOne({ userId: ObjectId(user._id), _id: ObjectId(fileId) });
      try {
        await dbClient.db.collection('files').updateOne({ _id: ObjectId(updatedFile.parentId) }, { $set: { updatedAt: new Date().toUTCString() } });
      } catch (err) { return; }
      updatedFile.id = updatedFile._id;
      delete updatedFile._id;
      delete updatedFile.localPath;
      res.json(updatedFile);
    }
  }

  // Get the content of a file identified by its id
  static async getFile(req, res) {
    // Get document by its id
    const doc = await dbClient.db.collection('files').findOne({ _id: ObjectId(req.params.id) });
    if (!doc || !Object.keys(doc).length) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Check for authorization token in request header
    const token = req.get('X-Token');

    // Get user id from redisCache
    const userId = await redisClient.get(`auth_${token}`);
    let user = false;
    if (userId) {
      user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    }

    // Check if the document is public and return as appropriate
    if (!doc.isPublic) {
      if (!user) {
        res.status(404).json({ error: 'Not found' });
        return;
      } if (doc.type === 'folder') {
        res.status(400).json({ error: 'A folder cannot return content' });
        return;
      }
    } else if (doc.type === 'folder') {
      res.status(400).json({ error: 'A folder cannot return content' });
      return;
    }

    // Get document content and return it
    if (doc.type === 'file') {
      read(doc.localPath, 'utf-8')
        .then((data) => {
          const mimeType = mime.lookup(doc.name) || 'application/octet-stream';
          return res.type(mimeType).send(data);
        })
        .catch((err) => {
          if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'Not found' });
          }
          return res.status(500).json({ error: err.message });
        });
    } else { // This branch runs for image files
      const { size } = req.query;
      let localPath;
      if (size) localPath = `${doc.localPath}_${size}`;
      else localPath = doc.localPath;

      read(localPath)
        .then((data) => res.type(mime.lookup(doc.name)).send(data))
        .catch((err) => {
          if (err.code === 'ENOENT') {
            res.status(404).json({ error: 'Not found' });
          } else {
            res.status(500).json({ error: err.message });
          }
        });
    }
  }

  static async updateFile(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    // Check that the request contains required data
    let documentId; let
      data;
    try {
      documentId = req.params.id;
      data = req.body.data;
    } catch (err) {
      res.status(400).json({ error: 'File id/data not provided' });
      return;
    }
    const doc = await dbClient.db.collection('files').findOne({ _id: ObjectId(documentId), userId: ObjectId(user._id) });

    // Check if file was found
    if (!doc || !Object.keys(doc).length) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Check if file is a folder
    if (doc.type === 'folder') {
      res.status(400).json({ error: 'Folders cannot be updated manually' });
      return;
    }

    const query = {};
    if (req.body.isPublic) query.isPublic = req.body.isPublic;
    if (req.body.name) query.name = req.body.name;
    if (req.body.parentId) query.parentId = req.body.parentId;
    query.updatedAt = new Date().toUTCString();

    // Update the image file and parent folder metadata in database
    try {
      await dbClient.db.collection('files').updateOne({ userId: ObjectId(doc.userId), _id: ObjectId(documentId) }, { $set: query });
      if (doc.parentId !== '0') await dbClient.db.collection('files').updateOne({ userId: ObjectId(doc.userId), _id: ObjectId(doc.parentId) }, { $set: { updatedAt: new Date().toUTCString() } });

      // Replace file in local storage
      if (query.data) {
        const fileBuffer = Buffer.from(data, 'base64');
        mkdirSync(process.env.FOLDER_PATH || '/tmp/files_manager', { recursive: true });
        writeFileSync(doc.localPath, fileBuffer);
      }
    } catch (err) {
      res.status(500).json({ error: 'The server could not update the file' });
      return;
    }
    if (doc.type === 'image') {
      // Delete old sub-versions of the image
      unlink('{doc.localPath}_100', () => {});
      unlink('{doc.localPath}_250', () => {});
      unlink('{doc.localPath}_500', () => {});

      // Create new image sub-versions
      fileQueue.add({ userId: String(user._id), fileId: documentId });
    }

    // Return new image file metadata
    const updatedFile = await dbClient.db.collection('files').findOne({ userId: ObjectId(user._id), _id: ObjectId(documentId) });
    updatedFile.id = updatedFile._id;
    delete updatedFile._id;
    delete updatedFile.localPath;
    res.json(updatedFile);
  }

  static async deleteFile(req, res) {
    const user = await FilesController.getUser(req, res);
    if (!user) return;

    // Check that request contains required data
    let documentId;
    try {
      documentId = req.params.id;
    } catch (err) {
      res.status(400).json({ error: 'File id not provided' });
      return;
    }

    // Check if the document to be deleted exists
    let doc;
    try {
      doc = await dbClient.db.collection('files').findOne({ userId: ObjectId(user._id), _id: ObjectId(documentId) });
      if (doc === null) throw Error();
    } catch (err) {
      res.status(404).json({ error: 'File does not exist' });
      return;
    }

    // If the file is a folder, delete all files in it before deleting the folder
    if (doc.type === 'folder') await dbClient.db.collection('files').deleteMany({ parentId: String(doc._id) });

    // Delete the file
    await dbClient.db.collection('files').deleteOne({ _id: ObjectId(documentId), userId: ObjectId(user._id) });

    // Update the file's parent folder's updatedAt timestamp
    try {
      if (doc.parentId !== '0') dbClient.db.collection('files').updateOne({ _id: ObjectId(doc.parentId) }, { $set: { updatedAt: new Date().toUTCString() } });
    } catch (err) {}

    res.status(204).send();
  }
}

export { FilesController };
