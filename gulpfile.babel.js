import fs from 'fs';

import minimist from 'minimist';
import sequence from 'run-sequence';

import gulp from 'gulp';
import babel from 'gulp-babel';
import bump from 'gulp-bump';
import changelog from 'gulp-conventional-changelog';
import connect from 'gulp-connect';
import eslint from 'gulp-eslint';
import git from 'gulp-git';
import test from 'gulp-mocha';
import notify from 'gulp-notify';
import nsp from 'gulp-nsp';
import open from 'gulp-open';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import gutil from 'gulp-util';

const argv = minimist(process.argv.slice(2));

gulp.task('bump-version', () => {
  let type;
  if (argv.major)      type = 'major';
  else if (argv.minor) type = 'minor';
  else                 type = 'patch';

  return gulp.src(['./package.json'])
    .pipe(bump({type}).on('error', gutil.log))
    .pipe(gulp.dest('./'));
});

gulp.task('changelog', () =>
  gulp.src('CHANGELOG.md', {buffer: false})
    .pipe(changelog({
      preset: 'angular' // Or to any other commit message convention you use.
    }))
    .pipe(gulp.dest('./'))
);

gulp.task('commit-changes', () =>
  gulp.src('.')
    .pipe(git.add())
    .pipe(git.commit('[Prerelease] Bumped version number'))
);

gulp.task('create-new-tag', (cb) => {
  var version = getPackageJsonVersion();
  git.tag(`v${version}`, 'Created Tag for version: ' + version, (error) => {
    if (error) return cb(error);
    cb();
    // git.push('origin', 'master', {args: '--tags'}, cb);
  });
});

gulp.task('lint', () =>
  gulp.src(['./index.js', './test/index.spec.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
);

gulp.task('test', () => {
  if (argv['skip-tests']) return gutil.log('Tests skipped via --skip-tests argument');

  return gulp.src('./test/*')
    .pipe(test({
      require: 'babel-register',
      reporter: 'spec',
    }));
});

gulp.task('full-checkup', gulp.series('lint', 'test'));

gulp.task('bundle', () =>
  gulp.src('index.js')
    .pipe(rename('knockout-undoredo.js'))
    .pipe(babel())
    .pipe(gulp.dest('dist'))

    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'))
);

gulp.task('build', gulp.series('full-checkup', 'bundle'));

gulp.task('serve-demo', () => {
  connect.server({
    port: 8888,
    root: '.'
  });
  gulp.src(__filename)
    .pipe(open({
      uri: 'http://localhost:8888/demo/'
    }));
});

gulp.task('do-release', gulp.series(
    'build',
    'bump-version',
    'changelog',
    'commit-changes',
    'create-new-tag',
  )
);


function getPackageJsonVersion() {
  // We parse the json file instead of using require because require caches
  // multiple calls so the version number won't be updated
  return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
}

function handleErrors(...args) {
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}
