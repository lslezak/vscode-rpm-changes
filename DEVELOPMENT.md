# Development tips

## Running the extension

- Install the required NodeJS modules: `npm install`
- Open the project in VSCode: `vscode .`
- Press `F5` to compile the sources and open a new window with the extension
  loaded. After any change in the sources press the `Ctrl+R` to reload the
  updated extension.

## Building extension

- Run `npx vsce package` to build an extension package locally, this generates
  a *.vsix package file.
- To install the extension locally run `code --install-extension *.vsix`.

## Links

- [TextMate grammar
  documention](https://macromates.com/manual/en/language_grammars) (VSCode uses
  the same format)
- [VSCode extension
  samples](https://github.com/microsoft/vscode-extension-samples)
- [VSCode extensions documentation](https://code.visualstudio.com/api)
