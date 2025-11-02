import * as vscode from "vscode";
import formatDistanceToNow from "date-fns/formatDistanceToNow";

// remember replacements for wrong weekdays and dates
export const dayReplacements = new Map<vscode.Range, string>();
export const dateReplacements = new Map<vscode.Range, number>();

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

const hoverDecorationType = vscode.window.createTextEditorDecorationType({});
const collection = vscode.languages.createDiagnosticCollection("rpm-changes");

export function updateDiagnostics(editor: vscode.TextEditor): number | null {
  dayReplacements.clear();
  dateReplacements.clear();

  const decorations: vscode.DecorationOptions[] = [];
  const document = editor.document;
  let newestChangeDate: number | null = null;

  if (document && document.languageId === "rpm-changes") {
    const regEx = /^(([A-Z][a-z]{2}) +[A-Z][a-z]{2} +([0-9]+) +[0-9:]+ +([A-Z]+) +([0-9]+)) +- +/gm;
    const text = document.getText();

    let lastMatchIndex = -1;
    let lastMatchLength = 0;
    let lastMatchDate: number | null = null;
    let match: RegExpExecArray | null;

    const diagnostics: vscode.Diagnostic[] = [];

    while ((match = regEx.exec(text))) {
      const timeZone = match[4];
      if (timeZone !== "UTC" && timeZone !== "CEST" && timeZone !== "CET") {
        diagnostics.push({
          message: `The RPM changes extension does not support timezone "${timeZone}" (only UTC, CET and CEST are supported)`,
          range: new vscode.Range(
            document.positionAt(
              match.index + match[1].length - match[4].length - match[5].length - 1
            ),
            document.positionAt(match.index + match[1].length - match[4].length - 1)
          ),
          severity: vscode.DiagnosticSeverity.Information,
        });
      } else {
        // Date parsing in JavaScript is broken for timezones other than UTC
        // so we replace CEST/CET with UTC+2/UTC+1
        const tzOffset = tzMappings[timeZone];
        const changeDate = tzOffset ? match[1].replace(timeZone, tzOffset) : match[1];

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

          continue;
        }

        // check for invalid dates like Feb 30, Apr 31... which are accepted by
        // the JavaScript Date parser by overflowing to the next month
        const day = Number(match[3]);
        if (day > 28) {
          const parsedDay = date.toLocaleString("en-US", {
            day: "numeric",
            // use a mapping because "CET" is supported but "CEST" is not :-(
            timeZone: offsetMappings[timeZone],
          });

          if (Number(parsedDay) !== day) {
            diagnostics.push({
              message: 'Invalid date "' + match[1] + '"',
              range: new vscode.Range(
                document.positionAt(match.index),
                document.positionAt(match.index + match[1].length)
              ),
              severity: vscode.DiagnosticSeverity.Error,
            });
            continue;
          }
        }

        // remember the newest change date
        if (newestChangeDate === null || unixTime > newestChangeDate) {
          newestChangeDate = unixTime;
        }

        const rangeDate = new vscode.Range(
          document.positionAt(match.index),
          document.positionAt(match.index + match[1].length)
        );

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
                new vscode.Location(document.uri, rangeDate),
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
            message: `The weekday "${match[2]}" does not match the date "${date.toDateString()}"`,
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

        // add hover decoration for the date
        decorations.push({
          range: rangeDate,
          hoverMessage: formatDistanceToNow(date, { addSuffix: true }),
        });
      }
    }

    collection.set(document.uri, diagnostics);
  } else {
    collection.clear();
  }

  // add hover decoration for the date
  editor.setDecorations(hoverDecorationType, decorations);

  // no change found, no refresh needed
  if (newestChangeDate === null) {
    return null;
  }

  // the "X minutes ago" hover messages are displayed for dates within the last
  // 45 minutes, so refresh them every minute; older dates are refreshed once
  // an hour
  return Date.now() - newestChangeDate < 45 * 60 * 1000 ? 60 * 1000 : 60 * 60 * 1000;
}
