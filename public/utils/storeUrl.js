const fs = require('fs');

let dir = process.cwd();

module.exports = function storeUrl(name, ret) {
    fs.writeFile(`${dir}/egghead/${name}.txt`, ret, {
        flag: 'a'
    }, function(err) {
        if (err)
            throw err;
        console.log("done!")
    });

}


