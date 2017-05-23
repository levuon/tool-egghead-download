var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

const http = require( "http" );
const request = require('request');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//首页面
app.get('/',function (req, res, next) {
    res.render("index",{title:"express"});
});

app.post('/download', function (req, res, next) {
    let lessonList = JSON.parse(req.body.list);
    lessonList.map( list => {
      setTimeout(() => {
          checkUrl( list )
      }, 10000); 
    } )
    console.log(lessonList);
});

function checkUrl(list) {
  request.post( {
        url: 'http://www.clipconverter.cc/check.php',
        headers: {
          "Content-Type": 'application/x-www-form-urlencoded'
        },
        form: {
          mediaurl: list.mediaurl
        }
      }, ( err, httpResponse, body ) => {
        const data = JSON.parse( body );
        if ( data && data.url ) {
          let item = data.url[ 0 ];
          startDownloadTask( item.url, '~/Downloads', list.name );
        }
  } );
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
      var totalBuff = Buffer.concat( fileBuff );
      fs.appendFile( dirName + "/" + fileName, totalBuff, function ( err ) {} );
    } );
  };
  return callback;
}

function startDownloadTask ( src, dirName, fileName ) {
  var req = http.request( src, getHttpReqCallback( dirName, fileName ) );
  req.on( 'error', function ( e ) {} );
  req.end();
}

//处理请求
app.post('/getVideos',function (req, res, next) {
    let url = req.body.url, mediaurlList = [];
    // post api
    url = url.split('?')[0];
    url = url.slice( url.lastIndexOf('/') + 1);
    url = `https://egghead.io/api/v1/lessons/${url}/next_up`
    console.log('begin request!', url);
    request.get( {
        url: url,
      }, ( err, httpResponse, body ) => {
        console.log('had return!');
        const data = JSON.parse( body );
        let list = data.list
        if ( list ) {
          let lessons = list.lessons;
          let items = "";
          
          mediaurlList = lessons.filter( Boolean ).reduce( ( p, n, index ) => {
            let temp = {}, url = n.lesson_http_url;
            temp.mediaurl = url;
            temp.name = `egghead-${index + 1}-${url.slice( url.lastIndexOf( '/' ) + 1 )}`;
            p.push( temp );
            return p;
          }, [] );
          
          
          lessons.map( lesson => {
            items = items + lesson.lesson_http_url + "<br/>"//拼接HTML
          })  
          console.log(items);
          res.send(JSON.stringify(mediaurlList));
        }
      } );
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
