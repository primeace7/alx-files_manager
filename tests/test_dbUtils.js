import { expect } from "chai";
import dbClient from '../utils/db';
import redisClient from "../utils/redis";


// Test MongoDB
describe('MongoDB client', function(){
    it('Should be alive', function(done){
        dbClient.isAlive()
        .then(msg => {
            expect(msg).to.equal(true);
            done();
        })
        .catch(err => done(err));
    });

    it('Should return a number as result for number of users', function(done){
        dbClient.nbUsers()
        .then(msg => {
            expect(msg).to.be.a('number');
            done();
        })
        .catch(err => done(err));
    });

    it('Should return a number as result for number of files', function(done){
        dbClient.nbFiles()
        .then(msg => {
            expect(msg).to.be.a('number');
            done();
        })
        .catch(err => done(err));
    });
});


// Test RedisCache functionalities
describe('RedisCache client', function(){
    it('Should be alive', function(){
        expect(redisClient.isAlive()).to.equal(true);
    });

    it('Should be able to set and get a value before expiration, then delete it afterwards', function(done){
        redisClient.set('testValue', 'FilesManager API', 1);
        redisClient.get('testValue')
        .then(msg => {
            expect(msg).to.equal('FilesManager API');
            done();
        })
        .catch(err => done(err));
        redisClient.del('testValue');
    });

    it('Should not be able to get a value after expiration', function(done){
        redisClient.get('testValue')
        .then(msg => {
            expect(msg).to.be.a('null');
            done();
        })
        .catch(err => done(err));
    });
});