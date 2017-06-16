'use strict';

const fs = require('fs');
const request = require('request');
const utils = require('./utils');
const R = require('ramda');
const { Either } = require('ramda-fantasy');
const { Left, Right } = Either;
const ProgressBar = require('./progressBar');
var pb = new ProgressBar('下载进度', 50);
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'egghead-download'});

// let gFileName = "";

// const loadResponse = R.curry(function(errAction, successAction) {
//   return Either.either(errAction, successAction)
// });

// // check response status 
// const compareStatus = R.curry(function(code, res){
//   return code !== res.statusCode ? Left(new Error('status #' + res.statusCode)) : Right(res)
// })

// const pbRender = R.curry(function(completed, total, name){
//    pb.render({completed, total, name})
// });

// const onData = R.curry(function(res){
  
// });

// const onEnd = function(res){

// }

// const checkRes = function(res) {
//   let checkStatus = R.compose( compareStatus(200), R.prop('statusCode'))

//   let res = checkStatus(res);
//   res.on('data', )

// }

// loadResponse(callBack, checkRes)

// function downloadFile(url, dirName, fileName, callback) {
//   callback = utils.callback(callback);
//   log.info(`download: %s => %s`, url, dirName )
//   gFileName = fileName
//   let totalSize = 0;
//   let downloadSize = 0;
//   request
//     .get({
//       url,
//       encoding: null,
//     })
//     .on('response', loadResponse(callBack, checkRes))
// };

module.exports = downloadFile

function downloadFile(url, dirName, fileName, callback) {
  callback = utils.callback(callback);
  const debug = utils.debug(`download: ${ url } => ${ dirName }`);
  debug('start');

  let totalSize = 0;
  let downloadSize = 0;
  request
    .get({
      url,
      encoding: null,
    })
    .on('response', res => {
      if (res.statusCode !== 200) {
        return callback(new Error('status #' + res.statusCode));
      }
      totalSize = res.headers['content-length'] || null;
      debug('totalSize: %s', totalSize);
      var fileBuff = [];
      res.on('data', data => {
        downloadSize += data.length;
        debug('progress: %s/%s', downloadSize, totalSize);
        var buffer = new Buffer( data );
        fileBuff.push( buffer );
        pb.render({
          completed: downloadSize, 
          total: totalSize,
          name: fileName
        });
      })
      .on( 'end', function () {
          var totalBuff = Buffer.concat( fileBuff );
          fs.appendFile( dirName + "/" + fileName, totalBuff, function ( err ) {
          } );
          callback(null, fileName);
       } );  
    })
};
