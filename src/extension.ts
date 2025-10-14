import * as vscode from "vscode";

import { date } from "./date";
import { packager } from "./packager";

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
        // Move the cursor to the very beginning of the document
        const startPosition = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(startPosition, startPosition);

				// Insert a new entry header
        editor.edit((editBuilder) => {
          editBuilder.insert(
            editor.selection.active,
            "-------------------------------------------------------------------\n"
          );
          editBuilder.insert(editor.selection.active, date());
          editBuilder.insert(editor.selection.active, " - ");
          editBuilder.insert(editor.selection.active, packager());
          editBuilder.insert(editor.selection.active, "\n\n- \n\n");
        });

        // Move the cursor to the line with a new entry description
        const editPosition = new vscode.Position(3, 2);
        editor.selection = new vscode.Selection(editPosition, editPosition);
				// Scroll to the cursor position if needed
        editor.revealRange(new vscode.Range(editPosition, editPosition));
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when the extension is deactivated
export function deactivate() {}
