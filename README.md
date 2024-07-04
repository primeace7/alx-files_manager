# Welcome to FilesManager!

FilesManager is a a files manger api service that provides create, read, update, delete, and more features for images, text-based files, and folders.

FilesManager is built with the following technologies:
- Expressjs
- MongoDB
- Redis
- Nodejs
- [Bull](https://github.com/OptimalBits/bull) (for background jobs)

## Concepts
FilesManager provides 15 endpoints on port 5000 for all of it's features. You're free to run the api server via any port you want by defining the *PORT* environment variable while starting the app. A user account is created through which files can be uploaded and managed. After creating an account, a user can do the following:

- Check the server status
- Sign in/out
- Upload files - text-based files, images, and folders
Text-based files and images are uploaded as base64-encoded strings. However, when a user requests for them, they are returned in their original types. For example, when a text file written in english is uploaded as a base64 string, it is returned in english. An image is returned with a content type of image.png, for example.
- Edit a file or delete it
- Publish/unpublish files to control their public visibility. Anyone can retrieve the content of a public file via its url
- Get a sub-version of an uploaded image. When an image file is uploaded, 3 sub-versions of widths 100px, 250px, and 500px are created in the background, in addition to the original image.

## Getting started
- Clone this repository and *cd* into it:
```
osaruonamen@osaruonamen:~$ git clone https://github.com/primace7/files_manager && cd files_manager
```
- Install the required packages:
```
osaruonamen@osaruonamen:~/files_manager$ npm install
```
- Start the api server:
```
osaruonamen@osaruonamen:~/files_manager$ npm run start-server

> files_manager@1.0.0 start-server
> nodemon --exec babel-node --presets @babel/preset-env ./server.js
.
.
.
Server running on port 5000
```
- In a seperate terminal, start the task worker to process background jobs:
```
osaruonamen@osaruonamen:~/files_manager$ npm run start-worker

> files_manager@1.0.0 start-worker
> nodemon --exec babel-node --presets @babel/preset-env ./worker.js
.
.
.
[nodemon] starting `babel-node --presets @babel/preset-env ./worker.js`
```
- Check the database status (although the tests cover this, you can also do this manually):
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/status ; echo ""
{"redis":true,"db":true}
```
See the [tests document](./documents/tests_document) for more info on running complete tests for the entire application.
- Check the number of users using the application, and the number of files for all users:
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/stats ; echo ""
{"users":0,"files":0}
```
## Documentation
- The [user guide](./documents/user_guide.md) provides more in-depth introduction and examples of many features of FilesManager. 
- A complete and thorough documentation is available in the [API Reference](./documents/API_Reference.yaml).

## Testing
To be sure that everything works correctly, a [test suite](./documents/tests_document) is provided to be run after the required packages are installed. Details of the test suite and how to run it are available in the tests document.
