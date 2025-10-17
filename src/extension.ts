import * as vscode from "vscode";

import { formatDate } from "./date";
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

// mappings for timezones not supported by JavaScript Date parser
const tzMappings: { [key: string]: string } = {
  CET: "UTC+1",
  CEST: "UTC+2",
};

// mappings for getting the correct weekday for a given timezone
const offsetMappings: { [key: string]: string } = {
  CET: "+01:00",
  CEST: "+02:00",
};

// remember replacements for wrong weekdays and dates
const dayReplacements = new Map<vscode.Range, string>();
const dateReplacements = new Map<vscode.Range, number>();

function updateDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): void {
  dayReplacements.clear();
  dateReplacements.clear();

  if (document && document.languageId === "rpm-changes") {
    const regEx =
      /^(([A-Z][a-z]{2}) +[A-Z][a-z]{2} +[0-9]+ +[0-9:]+ +([A-Z]+) +([0-9]+)) +- +/gm;
    const text = document.getText();

    let lastMatchIndex = -1;
    let lastMatchLength = 0;
    let lastMatchDate: number | null = null;
    let match: RegExpExecArray | null;

    const diagnostics: vscode.Diagnostic[] = [];

    while ((match = regEx.exec(text))) {
      const timeZone = match[3];
      if (timeZone !== "UTC" && timeZone !== "CEST" && timeZone !== "CET") {
        diagnostics.push({
          message: `The RPM changes extension does not support timezone "${timeZone}" (only UTC, CET and CEST are supported)`,
          range: new vscode.Range(
            document.positionAt(
              match.index +
                match[1].length -
                match[3].length -
                match[4].length -
                1
            ),
            document.positionAt(
              match.index + match[1].length - match[4].length - 1
            )
          ),
          severity: vscode.DiagnosticSeverity.Information,
        });
      } else {
        // Date parsing in JavaScript is broken for timezones other than UTC
        // so we replace CEST/CET with UTC+2/UTC+1
        const tzOffset = tzMappings[timeZone];
        const changeDate = tzOffset
          ? match[1].replace(timeZone, tzOffset)
          : match[1];

        const date = new Date(changeDate);
        const unixTime = date.getTime();

        if (isNaN(unixTime)) {
          diagnostics.push({
            message: 'Invalid date "' + match[1] + '"',
            range: new vscode.Range(
              document.positionAt(match.index),
              document.positionAt(match.index + match[1].length)
            ),
            severity: vscode.DiagnosticSeverity.Error,
          });
        } else {
          if (lastMatchDate && unixTime > lastMatchDate) {
            const range = new vscode.Range(
              document.positionAt(lastMatchIndex),
              document.positionAt(lastMatchIndex + lastMatchLength)
            );

            diagnostics.push({
              message: `Date "${text.slice(
                lastMatchIndex,
                lastMatchIndex + lastMatchLength
              )}" is not in sequence`,
              range,
              severity: vscode.DiagnosticSeverity.Error,
              relatedInformation: [
                new vscode.DiagnosticRelatedInformation(
                  new vscode.Location(
                    document.uri,
                    new vscode.Range(
                      document.positionAt(match.index),
                      document.positionAt(match.index + match[1].length)
                    )
                  ),
                  `Date "${match[1]}" is newer than this one`
                ),
              ],
            });

            // remember the replacement for later, propose using this time + 1 minute
            dateReplacements.set(range, unixTime + 60 * 1000);
          }

          const weekDay = date.toLocaleString("en-US", {
            weekday: "short",
            // use a mapping because "CET" is supported but "CEST" is not :-(
            timeZone: offsetMappings[timeZone],
          });

          if (weekDay !== match[2]) {
            const range = new vscode.Range(
              document.positionAt(match.index),
              document.positionAt(match.index + match[2].length)
            );

            diagnostics.push({
              message: `The weekday "${
                match[2]
              }" does not match the date "${date.toDateString()}"`,
              range,
              severity: vscode.DiagnosticSeverity.Warning,
            });

            // remember the replacement for later
            dayReplacements.set(range, weekDay);
          }

          // remember the last valid date
          lastMatchDate = unixTime;
          lastMatchIndex = match.index;
          lastMatchLength = match[1].length;
        }
      }
    }

    collection.set(document.uri, diagnostics);
  } else {
    collection.clear();
  }
}

// This method is called when the extension is deactivated
export function deactivate() {}

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
