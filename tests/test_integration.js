import { expect } from "chai";
import dbClient from "../utils/db";
import { kittyBuffer } from "../utils/kittyImage"; //Buffer containing a kitty's image

const rootURL = 'http://0.0.0.0:5000/api/v1';

const [email, password, data1, data2] = [
    'integrationTest@mail.com',
    'integration',
    'RmlsZXNNYW5hZ2VyIGlzIGJ1aWx0IHdpdGggTm9kZWpzIQ==', // FilesManager is built with Nodejs!
    'RmlsZXNNYW5hZ2VyIHJlcXVpcmVzIHJvYnVzdCBkb2N1bWVudGF0aW9uIGFuZCB0ZXN0aW5n' // FilesManager requires robust documentation and testing
];
const auth = {};
const stats ={};

describe('INTEGRATION TESTS FOR ALL ENDPOINTS', function(){
    describe('GET /status', function() {
        it('Return a JSON response with a status code of 200', function() {
            fetch(rootURL + '/status')
            .then(res => {
                expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                expect(res.status).to.equal(200);
            });
        });

        it('Redis and MongoDB should be running', function(done){
            fetch(rootURL + '/status')
            .then(res => res.json())
            .then(res => {
                expect(res).to.deep.equal({redis: true, db: true});
                done();
            })
            .catch(err => done(err));
        });

    })

    describe('GET /stats', function(){
        it('Return a JSON response with a status code of 200', function(done) {
            try{
                fetch(rootURL + '/status')
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    expect(res.status).to.equal(200);
                    done();
                })} catch(err){
                    done(err);
                };
        });

        it('Correctly count the number of users and files in database', async function(){
            await dbClient.nbUsers().then(res => stats.users = res);
            await dbClient.nbFiles().then(res => stats.files = res);
            try{
                await fetch(rootURL + '/stats')
                .then(res => res.json())
                .then(res => {
                    expect(res.users).to.equal(stats.users) && expect(res.files).to.equal(stats.files);
                })} catch(err) {
                    throw err;
                }
        })
    })

    describe('POST /users', function(){
        it('Return a JSON response with a status code of 400 for incomplete request data', function(done) {
            try{
                fetch(rootURL + '/users', {method: "POST"})
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    expect(res.status).to.equal(400);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it('Register a new user successfully and return the user id', function(done){
            try{
                fetch(rootURL + '/users', {
                    method: "POST", 
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({email, password}),
                })
                .then(res =>{
                    expect(res.status).to.equal(201);
                    return res.json();
                })
                .then(res => {
                    expect(res).to.have.property('id');
                    auth.userId = res.id;
                    expect(res.email).to.equal(email);
                    done();
                })
            } catch(err) {
                done(err);
            };
        })
    })

    describe('GET /connect', function(){
        it('Sign the user in and generate an Auth token', function(done) {
            try{
                fetch(rootURL + '/connect', {
                    headers: {
                        Authorization: `Basic ${Buffer.from(email + ':' + password).toString('base64')}`
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    expect(res.status).to.equal(200);
                    return res.json();
                })
                .then(res => {
                    expect(res).to.have.property('token');
                    auth.token = res.token;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it('Return a 401 status if user does not provide Basic Auth credentials', function(done) {
            try{
                fetch(rootURL + '/connect')
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
    })

    describe('GET /users/me', function(){
        it("Return a signed-in user's metadata as JSON", function(done) {
            try{
                fetch(rootURL + '/users/me', {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    expect(res.status).to.equal(200);
                    return res.json();
                })
                .then(res => {
                    expect(res).to.have.property('email', email);
                    expect(res).to.have.property('id');
                    expect(res).to.have.property('createdAt');
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it('Return a 401 status if user does not provide Basic Auth credentials', function(done) {
            try{
                fetch(rootURL + '/connect')
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
    })

    describe('GET /disconnect', function(){
        it("Sign a user out and return a 204 status code", function(done) {
            try{
                fetch(rootURL + '/disconnect', {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(204);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Trying to authenticate with a logged out token should fail with a 401 status", function(done) {
            try{
                fetch(rootURL + '/users/me', {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Sign in again to get another token", function(done) {
            try{
                fetch(rootURL + '/connect', {
                    headers: {
                        Authorization: `Basic ${Buffer.from(email + ':' + password).toString('base64')}`
                    }
                })
                .then(res => {
                    return res.json();
                })
                .then(res => {
                    auth.token = res.token;
                    done();
                })
            } catch(err){
                done(err);
            };
        });
    })

    describe('POST /files', function(){
        it("Upload a text file and return the file metadata with necessary info", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'textFile1', type: 'file', data: data1}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('createdAt', 'updatedAt', 'name', 'type', 'isPublic', 'userId', 'id', 'parentId')).to.be.true;
                    expect(res.name).to.equal('textFile1');
                    expect(res.type).to.equal('file');
                    expect(res.parentId).to.equal(0);
                    auth.textFile1Id = res.id;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return a 400 status when user tries to upload a file to an invalid parent folder", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'textFile1', type: 'file', parentId: 'invalid', data: data1}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(400);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return a 401 status when user tries to upload a file with invalid authentication", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'textFile1', type: 'file', data: data1}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': 'invalid token'
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Upload an image file and return the file metadata with necessary info", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'kittyImage.png', type: 'image', data: kittyBuffer.toString('base64')}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('name', 'createdAt', 'updatedAt', 'type', 'isPublic', 'userId', 'id', 'parentId')).to.be.true;
                    expect(res.name).to.equal('kittyImage.png');
                    expect(res.type).to.equal('image');
                    expect(res.parentId).to.equal(0);
                    auth.kittyImageId = res.id;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return a 400 status when user tries to upload an image to an invalid parent folder", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'kittyImage.png', type: 'image', parentId: 'invalid', data: kittyBuffer.toString('base64')}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(400);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return a 401 status when user tries to upload an image with invalid authentication", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'kittyImage.png', type: 'image', data: kittyBuffer.toString('base64')}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': 'invalid token'
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Upload a folder and return the folder metadata with necessary info", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'myFolder', type: 'folder'}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('name', 'cratedAt', 'updatedAt', 'type', 'isPublic', 'userId', 'id', 'parentId')).to.be.true;
                    expect(res.name).to.equal('myFolder');
                    expect(res.type).to.equal('folder');
                    expect(res.parentId).to.equal(0);
                    auth.folder1Id = res.id;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return a 400 status when user tries to upload a folder to an invalid parent folder", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'myFolder2', type: 'folder', parentId: 'invalid'}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(400);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return a 401 status when user tries to upload a folder with invalid authentication", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'myFolder3', type: 'folder'}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': 'invalid token'
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Upload a second text file which the parent folder is the just created folder and return metadata", function(done) {
            try{
                fetch(rootURL + '/files', {
                    method: "POST",
                    body: JSON.stringify({name:'textFile2', type: 'file', data: data2, parentId: auth.folder1Id}),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('name', 'createdAt', 'updatedAt', 'type', 'isPublic', 'userId', 'id', 'parentId')).to.be.true;
                    expect(res.name).to.equal('textFile2');
                    expect(res.type).to.equal('file');
                    expect(res.parentId).to.equal(auth.folder1Id);
                    auth.textFile2Id = res.id;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Upload 22 more text files to make a total of 26 files", function(done) {
            try {
                for (let i = 1; i < 23; i++){
                    fetch(rootURL + '/files', {
                        method: "POST",
                        body: JSON.stringify({name: `textFile${2+i}`, type: 'file', data: Buffer.from(`text file${i+1}`).toString('base64')}),
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Token': `${auth.token}`
                        }
                    })
                    .then(res => res.json())
                    .then(res => {
                        expect(Object.keys(res).includes('createdAt', 'updatedAt', 'name', 'type', 'isPublic', 'userId', 'id', 'parentId')).to.be.true;
                        expect(res.name).to.equal(`textFile${i+2}`);
                        expect(res.type).to.equal('file');
                        expect(res.parentId).to.equal(0);
                        auth[`textFile${i+2}Id`] = res.id;
                    })
                }
                done();                
            } catch (err) {
                done(err);
            }
        });

    })

    describe('GET /files/{id}', function(){
        this.beforeAll(()=>{
            auth.textFile1Url = `/files/${auth.textFile1Id}`;
            auth.textFile2Url = `/files/${auth.textFile2Id}`;
            auth.kittyImageUrl = `/files/${auth.kittyImageId}`;
            auth.folder1Url = `/files/${auth.folder1Id}`;
            let result;
        })

        it("Return correct metadata when retrieving a text file metadata by its id", function(done) {
            try{
                fetch(rootURL + auth.textFile1Url, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('name', 'type', 'id', 'userId', 'isPublic', 'parentId', 'createdAt', 'updatedAt')).to.be.true;
                    done();
                });
            } catch(err){
                done(err);
            };
        });

        it("Return correct metadata when retrieving an image file metadata by its id", function(done) {
            try{
                fetch(rootURL + auth.kittyImageUrl, {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('name', 'type', 'id', 'userId', 'isPublic', 'parentId', 'createdAt', 'updatedAt')).to.be.true;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return correct metadata when retrieving a folder metadata by its id", function(done) {
            try{
                fetch(rootURL + auth.folder1Url, {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(Object.keys(res).includes('name', 'type', 'id', 'userId', 'isPublic', 'parentId', 'createdAt', 'updatedAt')).to.be.true;
                    done();
                })
            } catch(err){
                done(err);
            };
        });


        it("Verify that an unauthenticated user cannot retrieve a private folder's metadata", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}`)
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });


        it("Verify that an unauthenticated user cannot retrieve a private file's metadata", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}`)
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });


        it("Verify that an unauthenticated user cannot retrieve a private image's metadata", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}`)
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
        
    })

    describe('GET /files', function(){

        it("Return JSON response with 20 elements (max) in root folder as page 0", function(done) {
            try{
                fetch(rootURL + '/files', {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    return res.json();
                })
                .then(res => {
                    expect(res).to.have.lengthOf(20);
                    done();
                });
            } catch(err){
                done(err);
            };
        });

        it("Return JSON response with correct number of elements in root folder as page 1", function(done) {
            try{
                fetch(rootURL + '/files?page=1', {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    return res.json();
                })
                .then(res => {
                    expect(res).to.have.lengthOf.below(21);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Return JSON response with 1 element in created folder", function(done) {
            try{
                fetch(rootURL + `/files?parentId=${auth.folder1Id}`, {
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('application/json');
                    return res.json();
                })
                .then(res => {
                    expect(res).to.have.lengthOf(1);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
        
    })

    describe('PUT /files/{id}', function(){

        it("Update the metadata of a text file when the file is updated", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}`, {
                    method: 'PUT',
                    headers: {
                        'X-Token': `${auth.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({name: 'textfile1_updated'})
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.name).to.equal('textfile1_updated');
                    done();
                });
            } catch(err){
                done(err);
            };
        });
        
    })

    describe('GET /files/{id}/data', function(){

        it("Retrieve the content of a text file and verify it's the same as the uploaded content", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}/data`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.text())
                .then(res => {
                    expect(res).to.equal(Buffer.from(data1, 'base64').toString());
                    done();
                });
            } catch(err){
                done(err);
            };
        });

        it("Retrieve the content of an image file and verify it's the same as the uploaded image", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('image/png');
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the 100px-width subversion of the uploaded image is available", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data?size=100`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(200);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the 250px-width subversion of the uploaded image is available", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data?size=250`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(200);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
        
        it("Verify that the 500px-width subversion of the uploaded image is available", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data?size=500`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(200);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that a 400 status is returned for a folder", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}/data`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(400);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that an unauthenticated user cannot retrieve the content of a private text file", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}/data`)
                .then(res => {
                    expect(res.status).to.equal(404);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that an unauthenticated user cannot retrieve a private image file", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data`)
                .then(res => {
                    expect(res.status).to.equal(404);
                    done();
                })
            } catch(err){
                done(err);
            };
        });        
    })

    describe('PUT /files/{id}/publish', function(){
        it("Publish a file to make it public", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}/publish`, {
                    method: "PUT",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.true;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the published file's content can be retrieved by an unauthenticated user", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}/data`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.text())
                .then(res => {
                    expect(res).to.equal(Buffer.from(data1, 'base64').toString());
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Publish an image to make it public", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/publish`, {
                    method: "PUT",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.true;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the published image's content can be retrieved by an unauthenticated user", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.headers.get('Content-Type').split(';')[0]).to.equal('image/png');
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Publish a folder to make it public", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}/publish`, {
                    method: "PUT",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.true;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the published folder's metadata can be retrieved by an unauthenticated user", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.true;
                    done();
                })
            } catch(err){
                done(err);
            };
        });
    })

    describe('PUT /files/{id}/unpublish', function(){
        it("Unpublish a file to make it private", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}/unpublish`, {
                    method: "PUT",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.false;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the unpublished file's content can't be retrieved by an unauthenticated user", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}/data`)
                .then(res => {
                    expect(res.status).to.equal(404);
                    done()
                })
            } catch(err){
                done(err);
            };
        });

        it("Unpublish an image to make it private", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/unpublish`, {
                    method: "PUT",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.false;
                    done()
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the unpublished image can't be retrieved by an unauthenticated user", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}/data`)
                .then(res => {
                    expect(res.status).to.equal(404);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Unpublish a folder to make it private", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}/unpublish`, {
                    method: "PUT",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => res.json())
                .then(res => {
                    expect(res.isPublic).to.be.false;
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the unpublished folder's metadata can't be retrieved by an unauthenticated user", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}`)
                .then(res => {
                    expect(res.status).to.equal(401);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
    })

    describe('DELETE /files/{id}', function(){
        it("Delete a text file and return a 204 status", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}`, {
                    method: "DELETE",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(204);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the deleted text file can no longer be retrieved and returns a 404", function(done) {
            try{
                fetch(rootURL + `/files/${auth.textFile1Id}`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(404);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Delete an image file and return a 204 status", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}`, {
                    method: "DELETE",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(204);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the deleted image can no longer be retrieved and returns a 404", function(done) {
            try{
                fetch(rootURL + `/files/${auth.kittyImageId}`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(404);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Delete a folder and return a 204 status", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}`, {
                    method: "DELETE",
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(204);
                    done();
                })
            } catch(err){
                done(err);
            };
        });

        it("Verify that the deleted folder's metadata can no longer be retrieved and returns a 404", function(done) {
            try{
                fetch(rootURL + `/files/${auth.folder1Id}`, {
                    headers: {
                        'X-Token': `${auth.token}`,
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(404);
                    done();
                })
            } catch(err){
                done(err);
            };
        });
    })

    describe('DELETE /users', function(){
        it('Delete the test user and all test files, and verify that a 204 status is returned', function(done){
            try{
                fetch(rootURL + '/users', {
                    method: "DELETE",
                    headers: {
                        'X-Token': `${auth.token}`
                    }
                })
                .then(res => {
                    expect(res.status).to.equal(204);
                    done();
                })
            } catch(err){
                done(err);
            }
        })
    })
})
