'use strict';
var express = require('express');
var router = express.Router();
var tweetBank = require('../tweetBank');
var client = require('../db');

module.exports = function makeRouterWithSockets (io) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    client.query('SELECT * FROM tweets INNER JOIN users ON users.id = tweets.userid ', function(err, result){
      if (err) return next(err);
      var allTheTweets = result.rows;
      console.log(Date(), result.rows);
      res.render('index', {
        title: 'Twitter.js',
        tweets: allTheTweets,
        showForm: true
      });
    
    });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next) {
    client.query('SELECT * FROM tweets INNER JOIN users ON users.id = tweets.userid WHERE users.name = $1',[req.params.username], 
      function(err, result){
        if (err) return next(err);
        var tweetsForName = result.rows;
        res.render('index', {
          title: 'Twitter.js',
          tweets: tweetsForName,
          showForm: true,
          //username: req.params.username
        });
      });
    
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    client.query('SELECT * FROM tweets INNER JOIN users ON users.id = tweets.userid WHERE tweets.id = $1', [req.params.id],
      function(err, result){
        if (err) return next(err);
        var tweetsWithThatId = result.rows;
        res.render('index', {
          title: 'Twitter.js',
          tweets: tweetsWithThatId,
          showForm: false,

        });
    });
  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){
    client.query('SELECT * FROM tweets INNER JOIN users ON users.id = tweets.userid WHERE users.name = $1', [req.body.name],
      function(err, result){
        if (err) return next(err);
        var firstTweetOfUser = result.rows[0];
        var userId;

        if (!firstTweetOfUser){

          client.query('INSERT INTO users (name, pictureurl) VALUES ($1, \'http://i.imgur.com/I8WtzSw.jpg\') RETURNING id', [req.body.name],
            function(err, result){
              if (err) return next(err);
              userId = result.rows[0].id;
              insertTweet(req.body.name, userId, req.body.content);
            });
        } else {
          userId = firstTweetOfUser.id;
          insertTweet(req.body.name, userId, req.body.content);
        }
        //console.log(result.rows, result.rows[0].name);
        function insertTweet(name, userId, content){
        client.query('INSERT INTO tweets (userid, content) VALUES ($1,$2) RETURNING id', [userId, content],
          function(err, result){
            if (err) return next(err);
            console.log('insert complete');
            var nextTweetId =  result.rows[0];
            var newTweet =  {name: name, content: content, id: nextTweetId };
            io.sockets.emit('new_tweet', newTweet);
            res.redirect('/');
          });
        }

      });
  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
};
