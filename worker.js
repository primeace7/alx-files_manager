import { ObjectId } from 'mongodb';
import { writeFileSync } from 'node:fs';
import dbClient from './utils/db';

const Bull = require('bull');
const thumbnail = require('image-thumbnail');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  // Ensure job has correct data
  if (!job.data.userId) return Promise.reject(Error('Missing userId'));
  if (!job.data.fileId) return Promise.reject(Error('Missing fileId'));

  // Get a file from database using fileId and userId
  const file = await dbClient.db.collection('files').findOne({ userId: ObjectId(job.data.userId), _id: ObjectId(job.data.fileId) });

  if (!file || !Object.keys(file).length) return Promise.reject(Error('File not found'));

  const filePath = file.localPath;

  // Generate thumbnails and save in local storage
  return Promise.all[
    thumbnail(filePath, { width: 100 }).then((img) => writeFileSync(`${filePath}_100`, img)),
    thumbnail(filePath, { width: 250 }).then((img) => writeFileSync(`${filePath}_250`, img)),
    thumbnail(filePath, { width: 500 }).then((img) => writeFileSync(`${filePath}_500`, img))];
});
