#!/usr/bin/env node

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

if (process.platform !== "darwin") {
	fail("This package is macOS-only. Run it on macOS 14+.");
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);
if (nodeMajor < 22) {
	fail(
		`Node 22+ is required because code-server 4.110.1 targets Node 22. Current version: ${process.versions.node}`,
	);
}

console.log(
	`Prerequisites OK: macOS + Node ${process.versions.node}.`,
);
