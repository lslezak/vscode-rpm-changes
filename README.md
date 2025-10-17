# VSCode RPM Changes Extension

This is an extension for the [Visual Studio
Code](https://code.visualstudio.com/) (VSCode) IDE.

It provides syntax highlighting for the RPM `*.changes` files and a command
for generating a new changes entry.

## Features

- Syntax highlighting, when the separator does not have exactly 67 dashes then
  it is displayed in red.
- It can automatically generate a new changes entry:
  - Use the command palette (`Ctrl+Shift+P`)
    and type `Insert a new changes entry` to execute the command.
  - Or right-click in the editor and select the `Insert a new changes entry`
    item in the context menu.
- The author name and email can be read from `.oscrc` file, from Git
  configuration or it can be configured in the extension settings, see below.
- On hover it displays a tooltip with relative date.
- Validates the weekday of the date, when changing a date manually you
  might forget to update the week day. A quick fix with the correct weekday
  is available.
- Validates the date sequence, dates not in sequence are reported as errors.
  As a quick fix previous change date increased by minutes is offered.

![Screencast](https://raw.githubusercontent.com/lslezak/vscode-rpm-changes/refs/tags/v1.0.1/media/screencast.gif)

## Extension Settings

This extension uses these settings:

- `rpm-changes.author.name`: The full name of the author.
- `rpm-changes.author.email`: The email of the author.

Just go to the settings configuration in VSCode (`Ctrl + ,`) and navigate to the
`Extensions -> RPM changes configuration` section.

## Known limitations

- Can process only UTC, CET and CEST time zone dates, others are ignored
  and not validated.
