import { ActionPanel, Form, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

interface Preferences {
  defaultPath: string;
  ideApp: string;
  initCommands: string;
}

interface InitCommand {
  label: string;
  command: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [name, setName] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // 解析配置为 { label, command }
  const parsedCommands: InitCommand[] = prefs.initCommands
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("=>");
      return {
        label: label.trim(),
        command: rest.join("=>").trim(),
      };
    })
    .filter((cmd) => cmd.label && cmd.command);

  const commandMap = new Map(parsedCommands.map((cmd) => [cmd.label, cmd.command]));

  const handleSubmit = async () => {
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Project name is required" });
      return;
    }

    const basePath = prefs.defaultPath.replace(/^~(?=$|\/|\\)/, homedir());
    const projectPath = join(basePath, name);

    try {
      mkdirSync(projectPath, { recursive: true });

      for (const label of selectedLabels) {
        const cmd = commandMap.get(label);
        if (cmd) {
          execSync(cmd, { cwd: projectPath, stdio: "inherit" });
        }
      }

      execSync(`open -a "${prefs.ideApp}" "${projectPath}"`);

      await showToast({
        style: Toast.Style.Success,
        title: "Project created",
        message: projectPath,
      });
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: err.message,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Project Name" value={name} onChange={setName} />
      <Form.TagPicker id="initCommands" title="Select Initialization Steps" onChange={setSelectedLabels}>
        {parsedCommands.map((cmd) => (
          <Form.TagPicker.Item key={cmd.label} value={cmd.label} title={cmd.label} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
