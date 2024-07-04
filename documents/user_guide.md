# Getting Started
### Start the api server:
```
osaruonamen@osaruonamen:~/files_manager$ npm run start-server

> files_manager@1.0.0 start-server
> nodemon --exec babel-node --presets @babel/preset-env ./server.js
.
.
.
Server running on port 5000
```
### In a seperate terminal, start the task worker to process background jobs:
```
osaruonamen@osaruonamen:~/files_manager$ npm run start-worker

> files_manager@1.0.0 start-worker
> nodemon --exec babel-node --presets @babel/preset-env ./worker.js
.
.
.
[nodemon] starting `babel-node --presets @babel/preset-env ./worker.js`
```
### Check the database status (although the tests cover this, you can also do this manually):
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/status ; echo ""
{"redis":true,"db":true}
```
### Check the number of users using the application, and the number of files for all users:
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/stats ; echo ""
{"users":0,"files":0}
```
### Create a new user:
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/users -H "Content-Type: application/json" -d '{ "email": "osaruonamen@mail.com", "password": "iLoveEngineering" }' ; echo ""
{"id":"6686b934d7d63d79e3b6929b","email":"osaruonamen@mail.com", "createdAt":"Thu, 04 Jul 2024 15:15:34 GMT"}
```
### Sign in with your credentials using Basic Auth to generate an api token or key:
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/connect -H "Authorization: Basic b3NhcnVvbmFtZW5AbWFpbC5jb206aUxvdmVFbmdpbmVlcmluZw==" ; echo ""
{"token":"dfcef8b8-b314-40d2-bb8c-99f2331a37c8"}
``` 
### Retrieve user profile info:
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/users/me -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
{"id":"6686bc9609d689817df23943","email":"osaruonamen@mail.com","createdAt":"Thu, 04 Jul 2024 15:15:34 GMT"}
```
### Upload a new text file with the content encoded in base64:
```
osaruonamen@osaruonamen:~$  curl -XPOST 0.0.0.0:5000/files -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" -H "Content-Type: application/json" -d '{ "name": "myFile.txt", "type": "file", "data": "d2VsY29tZSB0byBGaWxlc01hbmFnZXIh" }' ; echo ""
{"name":"myFile.txt","type":"file","parentId":0,"isPublic":false,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:25:00 GMT","updatedAt":"Thu, 04 Jul 2024 15:25:00 GMT","id":"6686becc5ce18583661303a2"}
```
### Create a new folder:
```
osaruonamen@osaruonamen:~$ curl -XPOST 0.0.0.0:5000/files -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" -H "Content-Type: application/json" -d '{ "name": "myFolder", "type": "folder" }' ; echo ""
{"name":"myFolder","type":"folder","parentId":0,"isPublic":false,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:28:46 GMT","updatedAt":"Thu, 04 Jul 2024 15:28:46 GMT","id":"6686bfae5ce18583661303a3"}
```
*Note*: for effieciency and brevity, the process of creating an image is best done via a high-level language script, which is not shown here, but detailed information about image creation is availabe in the [API Reference](./API_Reference.yaml).

### Retrieve the content of the text file using the file id:
```
osaruonamen@osaruonamen:~$ curl -XGET 0.0.0.0:5000/files/6686becc5ce18583661303a2/data -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
welcome to FilesManager!
``` 
*Note*: When an image is uploaded, 3 sub-versions with different widths (100px, 250px, and 500px) of the image are automatically created in the background. A user can subsequently request for any of these subversions. This is demonstrated later in this guide.

### Retrieve a file's metadata:
```
osaruonamen@osaruonamen:~$ curl -XGET 0.0.0.0:5000/files/6686bfae5ce18583661303a3 -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
{"id":"6686bfae5ce18583661303a3","name":"myFolder","type":"folder","parentId":0,"isPublic":false,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:28:46 GMT","updatedAt":"Thu, 04 Jul 2024 15:28:46 GMT"}
```
### Retrieve all files in a folder:
```
osaruonamen@osaruonamen:~$ curl -XGET 0.0.0.0:5000/files -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
[{"id":"6686becc5ce18583661303a2","name":"myFile.txt","type":"file","parentId":0,"isPublic":false,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:25:00 GMT","updatedAt":"Thu, 04 Jul 2024 15:25:00 GMT"},
{"id":"6686bfae5ce18583661303a3","name":"myFolder","type":"folder","parentId":0,"isPublic":false,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:28:46 GMT","updatedAt":"Thu, 04 Jul 2024 15:28:46 GMT"}]
```
### Publish/unpublish a file to control public access:
```
osaruonamen@osaruonamen:~$ curl -XPUT 0.0.0.0:5000/files/6686becc5ce18583661303a2/unpublish -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
{"name":"myFile.txt","type":"file","parentId":0,"isPublic":false,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:25:00 GMT","updatedAt":"Thu, 04 Jul 2024 18:31:01 GMT","id":"6686becc5ce18583661303a2"}
osaruonamen@osaruonamen:~$
osaruonamen@osaruonamen:~$ curl -XPUT 0.0.0.0:5000/files/6686becc5ce18583661303a2/publish -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
{"name":"myFile.txt","type":"file","parentId":0,"isPublic":true,"userId":"6686bc9609d689817df23943","createdAt":"Thu, 04 Jul 2024 15:25:00 GMT","updatedAt":"Thu, 04 Jul 2024 18:40:29 GMT","id":"6686becc5ce18583661303a2"}
```
### Retrieve an image - the original and the 250px sub-version:
```
osaruonamen@osaruonamen:~$ ls /tmp/dump/ | wc -l
0
osaruonamen@osaruonamen:~$ curl -XGET 0.0.0.0:5000/files/6686f77b225f05a294d2df34/data -so /tmp/dump/kitty.jpg ; file /tmp/dump/kitty.jpg
/tmp/dump/kitty.jpg: JPEG image data, JFIF standard 1.01, aspect ratio, density 1x1, segment length 16, baseline, precision 8, 275x183, components 3
osaruonamen@osaruonamen:~$ 
osaruonamen@osaruonamen:~$ curl -XGET 0.0.0.0:5000/files/6686f77b225f05a294d2df34/data?size=250 -so /tmp/dump/kitty.jpg ; file /tmp/dump/kitty.jpg
/tmp/dump/kitty.jpg: JPEG image data, baseline, precision 8, 250x166, components 3
```
### User sign out:
```
osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/disconnect -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""

osaruonamen@osaruonamen:~$ curl 0.0.0.0:5000/users/me -H "X-Token: d2fcbc02-87f3-4e06-9f80-6d619ee9829c" ; echo ""
{"error":"Unauthorized user"}
```