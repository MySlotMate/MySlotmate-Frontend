// Checks that src/lib/experienceForm.ts matches the copy in the other editor
// repo (Myslotmate-admin), when that repo is checked out next to this one.
// The file holds the experience form's shared rules, summaries and payload.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mine = join(root, "src/lib/experienceForm.ts");
const theirs = join(root, "../Myslotmate-admin/src/lib/experienceForm.ts");

if (!existsSync(theirs)) {
  console.log("Skipped: ../Myslotmate-admin is not checked out next to this repo.");
  process.exit(0);
}
if (readFileSync(mine, "utf8") !== readFileSync(theirs, "utf8")) {
  console.error(
    "src/lib/experienceForm.ts differs from ../Myslotmate-admin/src/lib/experienceForm.ts.\n" +
      "It is shared by both editors: copy your change to the other repo too.",
  );
  process.exit(1);
}
console.log("experienceForm.ts matches ../Myslotmate-admin.");
