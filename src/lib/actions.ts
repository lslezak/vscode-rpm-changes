import * as vscode from "vscode";
import { formatDate } from "./date";
import { dayReplacements, dateReplacements } from "./diagnostics";

/**
 * Provides code action for fixing wrong days of the week
 */
export class WeekdayActions implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    for (const [r, replacement] of dayReplacements) {
      // create the weekday fix if the replacement is in the requested range
      if (range.intersection(r)) {
        actions.push(this.createWeekdayFix(document, r, replacement));
      }
    }

    for (const [r, date] of dateReplacements) {
      // create the date fix if the replacement is in the requested range
      if (range.intersection(r)) {
        actions.push(this.createDateFix(document, r, date));
      }
    }

    return actions.length ? actions : undefined;
  }

  // create a code action that will replace the wrong weekday with the correct one
  private createWeekdayFix(
    document: vscode.TextDocument,
    range: vscode.Range,
    replacement: string
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      `Convert the day to "${replacement}"`,
      vscode.CodeActionKind.QuickFix
    );

    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, range, replacement);
    fix.isPreferred = true;

    return fix;
  }

  // create a code action that will replace a time out of sequence
  private createDateFix(
    document: vscode.TextDocument,
    range: vscode.Range,
    replacement: number
  ): vscode.CodeAction {
    const fixedDate = formatDate(new Date(replacement));
    const fix = new vscode.CodeAction(
      `Set the date to "${fixedDate}"`,
      vscode.CodeActionKind.QuickFix
    );

    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, range, fixedDate);
    fix.isPreferred = true;

    return fix;
  }
}
