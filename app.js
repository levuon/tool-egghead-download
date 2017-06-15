var express = require('express');
var path = require('path');
var fs = require('fs');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();



const request = require('request');
var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'egghead-download'
});

const R = require('ramda');
var Either = require('ramda-fantasy').Either;
var Left = Either.Left;
var Right = Either.Right;
const Task = require('data.task');


const ProgressBar = require('./public/utils/progressBar')
const startDownloadTask = require('./public/utils/old-download')
const download = require('./public/utils/new-download')
const storeUrl = require('./public/utils/storeUrl')
const utils = require('./public/utils/utils')


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//首页面
app.get('/', function (req, res, next) {
  res.render("index", {
    title: "express"
  });
});


const taskDownload = R.curry((index, url) => {
  return new Task(function (reject, resolve) {
    download(url, './download', `${lessonList[index].name}.mp4`, function (err, filename) {
      if (err) console.log(`出错：${ err }`);
      else {
        log.info(`\r\n下载完毕, 已保存到: ./download/${ filename }`)
        resolve()
      }
    });
    // setTimeout(function () {
    //   console.log('downtest', url);
    //   resolve()
    // }, 10000);
  })
})


// let dir = process.cwd();
let filesDir = path.resolve( __dirname, './download' );
let files = fs.readdirSync( filesDir );


const checkEqFileName = (fileName) => files.indexOf(`${fileName}.mp4`) < 0;

app.post('/download', function (req, res, next) {
  log.info('start to download!')
  lessonList = JSON.parse(req.body.list);
  
  // 检查download 是否已经下载过
  let filterFile = R.compose(
    R.filter( 
      R.compose( checkEqFileName,  R.prop('name') ) ) 
  );
  lessonList = filterFile(lessonList);
  let totalLength = (lessonList.length * 2)/10, composeList = [], i = 0;

  let wrapList = lessonList.reduce((prev,next, index) => {
    prev.unshift( index === 0 ? checkUrl(index) : R.chain(checkUrl(index)));
    prev.unshift( R.chain(taskDownload(index)));
    return prev;
  }, []);

  while(i < totalLength){
    composeList.push(R.compose.apply(R, wrapList.slice(i * 10, (i + 1) * 10)));
    i++;
  }

  var allDownloadTask = R.compose.apply(R, composeList);

  allDownloadTask(lessonList).fork(
    err => log.error('err', err.message),
    data => res.send('done')
  )
});


// serial download 串行下载
const checkUrl = R.curry(function (index, list) {
  return new Task(function (reject, resolve) {
    let url = `http://www.clipconverter.cc/check.php`,
      header = {
        "Content-Type": 'application/x-www-form-urlencoded'
      },
      form = {
        mediaurl: lessonList[index].mediaurl
      };
    requestPostFn(url, header, form)
      .map(R.compose(R.head, R.prop('url')))
      .fork(
        err => reject(err.message),
        item => {
          return resolve(item.url);
        }
      )
  })
})

app.post('/test', function (req, res, next) {
  var url = `http://embed.wistia.com/deliveries/e37c85a2976b62b2d9660b3ad3c20da0e022b77e.bin#type=mp4#size=7814168#hd`;
  download(url, './', 'text', function (err, filename) {
    if (err) console.log(`出错：${ err }`);
    else console.log(`\r\n已保存到：${ filename }`);
  });
})

const checkProps = R.curry(function (prop, obj) {
  return !!obj.prop ? Right(obj.prop) : Left(`can not get object ${obj.getName()} property ${prop}`)
})

const logError = err => console.log('Error: ' + error.message);
const logSuccess = data => console.log('data' + data);

// const eitherLogOrDone = Either.either(logError, logSuccess);

//处理请求
app.post('/getVideos', function (req, res, next) {
  let url = getEggheadUrlLessons(req.body.url),
    mediaurlList = [];
  log.info('begin request! %s', url);

  requestGetFp(url)
    .map(R.compose(assembleData, R.prop('lessons'), R.prop('list')))
    .fork(
      err => res.send(JSON.stringify(err)),
      data => (log.info('lessons: ', data), res.send(JSON.stringify(data)))
    );
});

// append 追加
const append = R.flip(R.concat);

// https://egghead.io/lessons/javascript-create-and-run-a-native-webassembly-function
// javascript-create-and-run-a-native-webassembly-function
const getEggheadUrlLessons = R.compose(
  append('/next_up'),
  R.concat('https://egghead.io/api/v1/lessons/'),
  R.last,
  R.split('/'),
  R.head,
  R.split('?')
);

const requestGetFp = function (url) {
  return new Task(function (reject, resolve) {
    log.info('start request!')
    request.get({
      url: url
    }, (err, httpResponse, body) => {
      err ? reject(err) : resolve(JSON.parse(body));
    })
  })
};

const requestPostFn = function (url, headers, form) {
  return new Task(function (reject, resolve) {
    // setTimeout(function () {
    //   resolve({
    //     url: 'http://www.baidu.com' 
    //   })
    // }, 4000);
    request.post({ url, headers, form }, (err, httpResponse, body) => {
      err ? reject(err) : resolve(JSON.parse(body));
    })
  })
}

// 组装data
const assembleData = function (list) {
  return list.filter(Boolean).reduce((p, n, index) => {
    let temp = {},
      url = n.lesson_http_url;
    temp.mediaurl = url;
    temp.name = `egghead-${index + 1}-${url.slice( url.lastIndexOf( '/' ) + 1 )}`;
    p.push(temp);
    return p;
  }, []);
}


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;