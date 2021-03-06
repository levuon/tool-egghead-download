const express = require('express');
const path = require('path');
const fs = require('fs');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const bunyan = require('bunyan');

// fp
const R = require('ramda');
const Either = require('ramda-fantasy').Either;
const Left = Either.Left;
const Right = Either.Right;
const Task = require('data.task');

// internal
const log = bunyan.createLogger({
  name: 'egghead-download'
});
const ProgressBar = require('./public/utils/progressBar');
const startDownloadTask = require('./public/utils/old-download');
const download = require('./public/utils/new-download');
const {
  trace,
  append,
  requestGetFp,
  requestPostFn
} = require('./public/utils/utils');
const {
  MP4,
  clipconverter
} = require('./public/utils/constants');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

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


// get fileName from download.
const dirFile = (() => {
  let filesDir = path.resolve(__dirname, './download');
  return fs.readdirSync(filesDir);
})();

const taskDownload = R.curry((index, url) => {
  return new Task(function (reject, resolve) {
    download(url, './download', `${lessonList[index].name}.mp4`, function (err, filename) {
      if (err)
        console.log(`出错：${err}`);
      else {
        log.info(`下载完毕, 已保存到: ./download/${filename}`)
        resolve()
      }
    });
  })
})



const checkEqFileName = R.curry((files, fileName) => files.indexOf(`${fileName}.${MP4}`) < 0);


/**
 * 失效了 egghead 视频改为mu38 格式 Deprecated
 */
app.post('/download', function (req, res, next) {
  log.info('start to download!')
  lessonList = JSON.parse(req.body.list);

  // 检查download 是否已经下载过
  let filterFile = R.compose(R.filter(R.compose(checkEqFileName(dirFile), R.prop('name'))));
  lessonList = filterFile(lessonList);
  let totalLength = (lessonList.length * 2) / 10,
    composeList = [],
    i = 0;

  let wrapList = lessonList.reduce((prev, next, index) => {
    prev.unshift(index === 0 ?
      checkUrl(index) :
      R.chain(checkUrl(index)));
    prev.unshift(R.chain(taskDownload(index)));
    return prev;
  }, []);

  // R.compose 最多接受10个参数，故超过10个使用apply
  while (i < totalLength) {
    composeList.push(R.compose.apply(R, wrapList.slice(i * 10, (i + 1) * 10)));
    i++;
  }

  const allDownloadTask = R.compose.apply(R, composeList);

  allDownloadTask(lessonList).fork(err => log.error('err', err.message), data => res.send('done'))
});

// serial download 串行下载
const checkUrl = R.curry(function (index, list) {
  log.info('start to get download url');
  return new Task(function (reject, resolve) {
    let url = clipconverter,
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
          log.info(item.url, 'checkUrl#get url');
          return resolve(item.url);
        }
      )
  })
});


app.post('/test', function (req, res, next) {
  var url = `http://embed.wistia.com/deliveries/e37c85a2976b62b2d9660b3ad3c20da0e022b77e.bin#type=mp4#size=7814168#hd`;
  download(url, './', 'text', function (err, filename) {
    if (err)
      console.log(`出错：${err}`);
    else
      console.log(`\r\n已保存到：${filename}`);
  });
})

const checkProps = R.curry(function (prop, obj) {
  return !!obj.prop ?
    Right(obj.prop) :
    Left(`can not get object ${obj.getName()} property ${prop}`)
})

const logError = err => console.log('Error: ' + error.message);
const logSuccess = data => console.log('data' + data);

// const eitherLogOrDone = Either.either(logError, logSuccess);

//处理请求
app.post('/getVideos', function (req, res, next) {
  let url = getEggheadUrlLessons(req.body.url),
    mediaurlList = [];
  console.log(url);
  log.info('begin request! %s', url);

  requestGetFp(url)
    .map(R.compose(assembleData, R.prop('lessons'), R.prop('list')))
    .fork(err => res.send(JSON.stringify(err)), data => (log.info('lessons: ', data), res.send(JSON.stringify(data))));
});

// https://egghead.io/lessons/javascript-create-and-run-a-native-webassembly-function
// javascript-create-and-run-a-native-webassembly-function
const getEggheadUrlLessons = R.compose(append('/next_up'), R.concat('https://egghead.io/api/v1/lessons/'), R.last, R.split('/'), R.head, R.split('?'));

// assemble data
const assembleData = function (list) {
  return list.filter(Boolean).reduce((p, n, index) => {
    let temp = {},
      url = n.lesson_http_url;
    temp.mediaurl = url;
    temp.name = `egghead-${index + 1}-${url.slice(url.lastIndexOf('/') + 1)}`;
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
