import express from 'express';
import { AppController } from '../controllers/AppController';
import { UsersController } from '../controllers/UsersController';
import { AuthController } from '../controllers/AuthController';
import { FilesController } from '../controllers/FilesController';

const router = express.Router();

router.use(express.json({ limit: '50mb' }));

// Appcontrollers
router.get('/api/v1/status', AppController.getStatus);
router.get('/api/v1/stats', AppController.getStats);

// Userdata controllers
router.post('/api/v1/users', UsersController.postNew);
router.get('/api/v1/users/me', UsersController.getMe);
router.delete('/api/v1/users', UsersController.deleteUser);

// Authentication controllers
router.get('/api/v1/connect', AuthController.getConnect);
router.get('/api/v1/disconnect', AuthController.getDisconnect);

// Files controllers
router.post('/api/v1/files', FilesController.postUpload);
router.get('/api/v1/files/:id', FilesController.getShow);
router.get('/api/v1/files', FilesController.getIndex);
router.put('/api/v1/files/:id/publish', FilesController.putPublish);
router.put('/api/v1/files/:id/unpublish', FilesController.putUnpublish);
router.get('/api/v1/files/:id/data', FilesController.getFile);
router.put('/api/v1/files/:id', FilesController.updateFile);
router.delete('/api/v1/files/:id', FilesController.deleteFile);

export { router };
