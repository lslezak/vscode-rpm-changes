import * as vscode from "vscode";

import { WeekdayActions } from "./lib/actions";
import { addNewEntry } from "./lib/editor";
import { updateDiagnostics } from "./lib/diagnostics";

/**
 * Activate the extension
 * @param context extension context from VSCode
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    // The commandId parameter must match the command field in package.json
    "rpm-changes.insertNewEntry",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "rpm-changes") {
        addNewEntry(editor);
      }
    }
  );

  context.subscriptions.push(disposable);

  const collection = vscode.languages.createDiagnosticCollection("rpm-changes");
  let activeEditor = vscode.window.activeTextEditor;
  // delay updating the diagnostics if the document is changing too quickly
  let timeout: NodeJS.Timeout | undefined = undefined;

  if (activeEditor) {
    updateDiagnostics(activeEditor.document, collection);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;

      if (editor) {
        updateDiagnostics(editor.document, collection);
      }
    })
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      // a change in the active *.changes document, postpone the validation to
      // avoid too many expensive updates when the user is typing very quickly
      if (
        activeEditor &&
        event.document === activeEditor.document &&
        activeEditor.document.languageId === "rpm-changes"
      ) {
        // if there already is a pending validation then cancel it
        if (timeout) {
          clearTimeout(timeout);
        }
        // schedule a new validation
        timeout = setTimeout(
          () =>
            activeEditor &&
            updateDiagnostics(activeEditor.document, collection),
          500
        );
      }
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      "rpm-changes",
      new WeekdayActions(),
      {
        providedCodeActionKinds: WeekdayActions.providedCodeActionKinds,
      }
    )
  );
}

// This method is called when the extension is deactivated
export function deactivate() {}
