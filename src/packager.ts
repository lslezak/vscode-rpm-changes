import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as childProcess from "child_process";

/**
 * Find the .oscrc configuration file in the system
 *
 * @returns {string | null} the path to the oscrc file or null if not found
 */
function findOscRc(): string | null {
  // see https://github.com/openSUSE/osc/blob/10f5e7309ea6ae6f45e03b3e672dcdd853c0136e/osc/conf.py#L2123
  if (process.env.OSC_CONFIG && fs.existsSync(process.env.OSC_CONFIG)) {
    return process.env.OSC_CONFIG;
  }

  if (process.env.HOME && process.env.HOME !== "") {
    const configPath = path.join(process.env.HOME, ".oscrc");

    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  if (process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME !== "") {
    const configPath = path.join(process.env.XDG_CONFIG_HOME, "osc", "oscrc");

    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  if (process.env.HOME && process.env.HOME !== "") {
    const configPath = path.join(process.env.HOME, ".config", "osc", "oscrc");

    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Read the author name and email from the oscrc configuration file
 *
 * @param file the oscrc configuration file
 * @returns an object with name and email properties (undefined if not found)
 */
function readOscRc(file: string): {
  name: string | undefined;
  email: string | undefined;
} {
  const config = fs.readFileSync(file, "utf-8");
  let name, email;

  for (const line in config.split("\n")) {
    if (!email) {
      const emailMatch = line.match(/^\s*email\s*=\s*(\S.*)$/);
      if (emailMatch) {
        email = emailMatch[1].trim();
        continue;
      }
    }

    if (!name) {
      const nameMatch = line.match(/^\s*realname\s*=\s*(\S.*)$/);
      if (nameMatch) {
        name = nameMatch[1].trim();
        continue;
      }
    }
  }

  return { name, email };
}

/**
 * Format the packager string
 *
 * @param {string} name name of the author
 * @param email author's email
 * @returns {string} formatted string "name <email>"
 */
function formatPackager(name: string, email: string): string {
  return `${name} <${email}>`;
}

/**
 * Get the the packager name string for a new changes entry:
 * 1. Use the VSCode configuration if defined ("rpm-changes.author.name" and "rpm-changes.author.email" configurations)
 * 2. Read the name and emails from .oscrc file ("realname" and "email" values)
 * 3. Output of `rpmdev-packager` command
 * 4. Fallback value "Your Name <your_email@example.com>"
 *
 * @returns {string} The packager name in format "name <email>"
 */
export function packager(): string {
  // Read from VSCode configuration
  const configuration = vscode.workspace.getConfiguration("rpm-changes");
  const configuredName = configuration.get<string>("author.name");
  const configuredEmail = configuration.get<string>("author.email");

  if (configuredName && configuredEmail) {
    return formatPackager(configuredName, configuredEmail);
  }

  // https://github.com/openSUSE/obs-build/blob/277ee4c8f01904b0f0a77a6674e46f1132a16f48/vc#L34

  const oscrc = findOscRc();

  if (oscrc) {
    let { name, email } = readOscRc(oscrc);
    if (name) {
      if (!email && process.env.mailaddr && process.env.mailaddr !== "") {
        email = process.env.mailaddr;
      }

      if (name && email) {
        return formatPackager(name, email);
      }
    }
  }

  const rpmdevPackager = "/usr/bin/rpmdev-packager";

  if (fs.existsSync(rpmdevPackager)) {
    try {
      const output = childProcess.execSync(rpmdevPackager, {
        encoding: "utf-8",
      });

      if (output) {
        return output.trim();
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Fallback value
  return formatPackager("Your Name", "your_email@example.com");
}
