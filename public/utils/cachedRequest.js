const request = require('request');





module.exports = function(url, option) {
    let expiry = 5 * 60 // 默认 5 min
    if (typeof options === 'number') {
        expiry = options
        options = undefined
    } else if (typeof options === 'object') {
        // 但愿你别设置为 0
        expiry = options.seconds || expiry
    }
    let cacheKey = url
    let cached = localStorage.getItem(cacheKey)
    let whenCached = localStorage.getItem(cacheKey + ':ts')
    if (cached !== null && whenCached !== null) {
        let age = (Date.now() - whenCached) / 1000
        if (age < expiry) {
            let response = new Response(new Blob([cached]))
            return Promise.resolve(response)
        } else {
            // 清除旧值
            localStorage.removeItem(cacheKey)
            localStorage.removeItem(cacheKey + ':ts')
        }
    }
     request.get( {
        url: url,
      }, ( err, httpResponse, body ) => {
        const data = JSON.parse( body );
        body.clone().then(content => {
          localStorage.setItem(cacheKey, content)
          localStorage.setItem(cacheKey+':ts', Date.now())
        })
        log.info(JSON.parse(body));
        return Promise.resolve(JSON.parse(body));
      } );
}