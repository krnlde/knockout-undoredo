import gulp from 'gulp';
import runSequence from 'run-sequence';
import conventionalChangelog from 'gulp-conventional-changelog';
import bump from 'gulp-bump';
import gutil from 'gulp-util';
import git from 'gulp-git';
import minimist from 'minimist';
import fs from 'fs';

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
    .pipe(conventionalChangelog({
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

gulp.task('build', (done) => {
  runSequence(
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
