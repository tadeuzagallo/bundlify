#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');

var entry = process.argv[2];

if (!entry) {
  console.log('Usage: planify entry_point.js');
}

var Utils = {
  indentationSize: 2,
  convertFileName: function (filename) {
    return 'Module$' + filename.replace(/^\.\//, '')
      .replace(/\/(.)/g, function (all, $1){
        return $1.toUpperCase();
      }).replace(/\.js$/, '');
  },
  normalize: function (name) {
    if (!/\.js$/.test(name)) {
      name += '.js';
    }

    return name;
  },
  readFile: function (filename, success) {
    fs.readFile(filename, function (err, content) {
      if (err) {
        throw err;
      } else {
        success(content);
      }
    });
  },
  indent: function (text) {
    return text.split('\n').map(function (line) {
      for (var i = 0; i < Utils.indentationSize; i++) {
        line = ' ' + line;
      }

      return line;
    }).join('\n');
  }
};

var File = function (filename, dependencies, content) {
  this.filename = Utils.convertFileName(filename);
  this.dependencies = dependencies || [];
  this.content = content;
};


File.deps = [Utils.normalize(entry)];

File.requireRegex = /require\(('|")(.*)\1\)/g;

File.readDeps = function (filename, cb) {
  filename = Utils.normalize(filename);

  var found = 0;
  var processed = 0;
  Utils.readFile(filename, function (content) {
    content.toString().replace(File.requireRegex, function (all, $1, $2) {
      if (!/^\.\//.test($2)) {
        return $2;
      }

      var depName = Utils.normalize(path.join(path.dirname(filename), $2));
      var index;

      found += 1;

      if ((index = File.deps.indexOf(depName)) !== -1) {
        var index2 = File.deps.indexOf(filename);
        if (index2 < index) {
          File.deps.splice(index2, 1);
          File.deps = File.deps.slice(0, index).concat(filename).concat(File.deps.slice(index));
        }
        ++processed;
      } else {
        File.deps.unshift(depName);

        File.readDeps(depName, function () {
          if (++processed === found) {
            cb(File.deps);
          }
        });
      }
    });

    (!found || found === processed) && cb();

  });
};

File.readDeps(entry, function () {
  var processed = 0;

  File.deps.forEach(function (filename, index) {
    Utils.readFile(filename, function (content) {
      File.render(filename, index, content.toString());

      if (++processed === File.deps.length) {
        File.close();
      }
    });
  });
});

File.render = function (filename, index, content) {
      content = content.replace(File.requireRegex, function (all, $1, $2) {
        return Utils.convertFileName($2);
      });

      if (index < File.deps.length - 1) {
        content = File.wrap(filename, content);
      }

      File.deps[index] = content;
};

File.wrap = function (filename, content) {
  return 'var ' + Utils.convertFileName(filename) + ' = ' +
    '(function(module){\n' +
      Utils.indent(
        content + '\n' +
        'return module.exports;'
      ) + '\n' +
    '})({});';
};

File.close = function () {
  console.log(
    '(function () {\n' +
      Utils.indent(File.deps.join('\n\n')) + '\n' +
    '})();');
};
