'use strict';


const os = require('os');
const path = require('path');
const createDebug = require('debug');
const request = require('request');
const R = require('ramda');
const Task = require('data.task');
const DEBUG_PREFIX = 'lei-download:';
const utilsDebug = createDebug(DEBUG_PREFIX + 'utils');

exports.debug = function debug(name) {
  return createDebug(DEBUG_PREFIX + name);
};

exports.callback = function callback(fn) {
  let hasCallback = false;
  return function () {
    const args = Array.prototype.slice.call(arguments);
    if (hasCallback) {
      utilsDebug('callback twice: %s', args);
    } else {
      utilsDebug('callback: %s', args);
      hasCallback = true;
      fn.apply(null, args);
    }
  };
};

const getTmpDir = os.tmpdir || os.tmpDir;

exports.randomString = function randomString(size, chars) {
  size = size || 6;
  chars = chars || 'abcdefghijklmnopqrstuvwxyz0123456789';
  const max = chars.length + 1;
  let str = '';
  while (size > 0) {
    str += chars.charAt(Math.floor(Math.random() * max));
    size -= 1;
  }
  return str;
};

exports.randomFilename = function randomFilename(tmpDir) {
  tmpDir = tmpDir || getTmpDir();
  return path.resolve(tmpDir, exports.randomString(20));
};

exports.isURL = function isURL(url) {
  if (url.substr(0, 7) === 'http://') return true;
  if (url.substr(0, 8) === 'https://') return true;
  return false;
};

exports.trace = R.curry(function(tag, arg){
  console.log(tag, arg);
  return arg;
})

exports.requestGetFp = function (url) {
  return new Task(function (reject, resolve) {
    log.info('start request!')
    request.get({
      url: url
    }, (err, httpResponse, body) => {
      err ? reject(err) : resolve(JSON.parse(body));
    })
  })
};

exports.requestPostFn = function (url, headers, form) {
  return new Task(function (reject, resolve) {
    request.post({ url, headers, form }, (err, httpResponse, body) => {
      err ? reject(err) : resolve(JSON.parse(body));
    })
  })
} 
// append 追加
export const append = R.flip(R.concat);