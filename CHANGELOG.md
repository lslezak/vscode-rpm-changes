# Change Log

Here is a summary of the notable changes in the "rpm-changes" extension.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how
to structure this file.

## [Unreleased]

## [1.1.2] - 2025-10-29

- Fixed displaying relative date for days greater than 28

## [1.1.1] - 2025-10-19

- Refresh the "X minutes ago" hover messages every minute so they always use the
  correct value, the others are refreshed once an hour.
- Check for invalid dates like Feb 30 or Apr 31 which are accepted by
  the JavaScript Date parser by overflowing to the next month but should be
  reported as invalid by the validator.

## [1.1.0] - 2025-10-18

- Validate the order of the changes, propose a quick fix (previous + 1 minute)
- Validate the weekday value, propose a quick fix with the correct weekday
- Less strict regular expression for matching the date header
- Show a tooltip with relative date ("5 days ago") on hover
- Do not package the screencast GIF into the published VSCode package,
  makes the package much smaller.
- Added package icon :smiley:

## [1.0.0] - 2025-10-14

- Initial release
