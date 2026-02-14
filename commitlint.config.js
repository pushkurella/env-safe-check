module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // A new feature
        'fix',      // A bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that don't affect code meaning (formatting, missing semicolons, etc.)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Code change that improves performance
        'test',     // Adding or updating tests
        'ci',       // Changes to CI configuration files and scripts
        'chore',    // Changes to build process, dependencies, etc.
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
