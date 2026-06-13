export const defaultTriggerSource = `export const config = {
  timeoutMs: 1000,
  maxProposals: 1,
};

export default function trigger(context) {
  if (context.action.author.kind !== "user") return [];

  return [
    {
      skillKey: "think",
      args: {
        prompt: "A direct user action happened in PRO. Summarize the event and suggest one useful next directory action. " + JSON.stringify(context.action),
      },
    },
  ];
}
`;

export const defaultExecuteCode = `from pathlib import Path

path = Path("daytona-note.txt")
path.write_text("Daytona wrote this file from a real box.\\n", encoding="utf-8")
print("wrote", path)
`;
