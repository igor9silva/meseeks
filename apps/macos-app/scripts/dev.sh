#!/bin/sh

set -eu

arch="$(uname -m)"

case "$arch" in
	arm64)
		build_arch="arm64"
		;;
	x86_64)
		build_arch="x64"
		;;
	*)
		echo "Unsupported macOS architecture: $arch" >&2
		exit 1
		;;
esac

bun run build:dev

launcher="./build/dev-macos-$build_arch/Local Workbench-dev.app/Contents/MacOS/launcher"

if [ ! -x "$launcher" ]; then
	echo "Missing app launcher at $launcher" >&2
	exit 1
fi

echo "Launching $launcher"
exec "$launcher"
