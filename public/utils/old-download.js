
const progressBar = require('single-line-log').stdout;
const fs = require('fs');
const http = require( "http" );
const request = require('request');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'egghead-download'});

var read = 0;

module.exports = function startDownloadTask ( src, dirName, fileName ) {
  log.info(`start download ${fileName}`);
  var req = http.request( src, getHttpReqCallback( dirName, fileName ) );
  req.on( 'error', function ( e ) {
    log.error(e.message);
  } );
  req.end();
}


function getHttpReqCallback ( dirName, fileName ) {
  var fileName = `${fileName}.mp4`;
  var callback = function ( res ) {
    var fileBuff = [];
    res.on( 'data', function ( chunk ) {
      
      var buffer = new Buffer( chunk );
      fileBuff.push( buffer );
    } );
    res.on( 'end', function () {
      log.info(`finish download ${fileName}`)
      log.info(`${dirName}/${fileName}`)
      var totalBuff = Buffer.concat( fileBuff );
      fs.appendFile( dirName + "/" + fileName, totalBuff, function ( err ) {
      } );
    } );
  };
  return callback;
}