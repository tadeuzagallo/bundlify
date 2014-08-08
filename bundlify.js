#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');

var entry = process.argv[2];
var translations = {};
var output = false;

if (!entry) {
  console.log('Usage: bundlify entry_point.js');
}

var argc = process.argv.length;
if (argc > 3) {
  for (var i = 3; i < argc; i++) {
    var t = process.argv[i].split(':');
    if (t[0]) {
      translations[t[0]] = t[1];
    } else {
      output = t[1];
    }
  }
}

var Utils = {
  indentationSize: 2,
  convertFileName: function (filename) {
    return 'Module$' + filename.replace(/^\.\//, '')
      .replace(/(?:\/|_)(.)/g, function (all, $1){
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
        return translations[$2] ? 'this.' + translations[$2] : Utils.convertFileName(path.join(path.dirname(filename), $2));
      });

      if (index < File.deps.length - 1) {
        content = 'var ' + Utils.convertFileName(filename) + ' = ' + File.wrap(content);
      }

      File.deps[index] = content;
};

File.wrap = function (content) {
  return '(function(module){\n' +
      Utils.indent(
        content + '\n' +
        'return module.exports;'
      ) + '\n' +
    '}).call(this, {});';
};

File.close = function () {
  console.log(
    (output ? 'this.' + output + ' = ' : '') +
    File.wrap(File.deps.join('\n\n'))
  );
};
