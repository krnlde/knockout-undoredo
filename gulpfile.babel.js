import fs from 'fs';

import sequnece from 'run-sequence';
import minimist from 'minimist';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import browserify from 'browserify';
import babelify from 'babelify';

import gulp from 'gulp';
import bump from 'gulp-bump';
import changelog from 'gulp-conventional-changelog';
import eslint from 'gulp-eslint';
import git from 'gulp-git';
import notify from 'gulp-notify';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import gutil from 'gulp-util';

gulp.task('bump-version', () => {
  const argv = minimist(process.argv.slice(2));
  let type;
  if (argv.major)      type = 'major';
  else if (argv.minor) type = 'minor';
  else                 type = 'patch';

  return gulp.src(['./package.json'])
    .pipe(bump({type}).on('error', gutil.log))
    .pipe(gulp.dest('./'));
});

gulp.task('changelog', function () {
  return gulp.src('CHANGELOG.md', {
    buffer: false
  })
    .pipe(changelog({
      preset: 'angular' // Or to any other commit message convention you use.
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('commit-changes', () => {
  return gulp.src('.')
    .pipe(git.add())
    .pipe(git.commit('[Prerelease] Bumped version number'));
});

gulp.task('create-new-tag', (cb) => {
  var version = getPackageJsonVersion();
  git.tag(version, 'Created Tag for version: ' + version, (error) => {
    if (error) return cb(error);
    // git.push('origin', 'master', {args: '--tags'}, cb);
  });
});

gulp.task('lint', () => {
  gulp.src('./index.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('build', ['lint'], () => {
  const file = './index.js';
  const bundler = browserify({
    entries: [file],
    transform: [babelify]
  });

  function rebundle() {
    const then = new Date();
    const stream = bundler.bundle();
    return stream
      .on('error', handleErrors)
      .pipe(source(file))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(rename({basename: 'knockout-undoredo.min'}))
      .pipe(notify())
      .pipe(gulp.dest('./dist/'))
  }

  // listen for an update and run rebundle
  bundler.on('update', () => {
    const then = new Date();
    gutil.log('Rebundling...');

    rebundle().on('end', () => {
      const now = new Date();
      const sec = ((now - then) / 1000).toPrecision(3);

      gutil.log('Rebundled after', gutil.colors.magenta(sec + ' s'));
    });
  });

  // run it once the first time buildScript is called
  return rebundle();
});

gulp.task('do-release', (done) => {
  sequnece(
    'build',
    'bump-version',
    'changelog',
    'commit-changes',
    'create-new-tag',
    (error) => {
      if (error) gutil.log(error.message);
      else gutil.log('RELEASE FINISHED SUCCESSFULLY');
      callback(error);
    },
  );
});


function getPackageJsonVersion () {
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
