import * as vscode from "vscode";
import { formatDate } from "./date";
import { packager } from "./packager";

/**
 * Add a new entry to the changes file in the active editor
 * @param editor The active text editor
 */
export function addNewEntry(editor: vscode.TextEditor) {
  // Move the cursor to the very beginning of the document
  const startPosition = new vscode.Position(0, 0);
  editor.selection = new vscode.Selection(startPosition, startPosition);

  // Insert a new entry header
  editor.edit((editBuilder) => {
    editBuilder.insert(
      editor.selection.active,
      "-------------------------------------------------------------------\n"
    );
    editBuilder.insert(editor.selection.active, formatDate());
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
