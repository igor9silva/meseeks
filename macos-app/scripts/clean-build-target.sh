#!/bin/sh

set -eu

build_environment="${1:-}"

if [ -z "$build_environment" ]; then
	echo "Usage: sh ./scripts/clean-build-target.sh <dev|stable>" >&2
	exit 1
fi

case "$build_environment" in
	dev|stable)
		;;
	*)
		echo "Unsupported build environment: $build_environment" >&2
		exit 1
		;;
esac

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

project_root="$(pwd)"

case "$build_environment" in
	dev)
		app_bundle="$project_root/build/$build_environment-macos-$build_arch/Local Workbench-dev.app"
		;;
	stable)
		app_bundle="$project_root/build/$build_environment-macos-$build_arch/Local Workbench.app"
		;;
esac

pkill -f "$app_bundle" >/dev/null 2>&1 || true
sleep 1

mkdir -p ./build
trash_root="./build/.trash"
target_dir="./build/$build_environment-macos-$build_arch"

mkdir -p "$trash_root"

if [ -e "$target_dir" ]; then
	trash_target="$trash_root/$build_environment-macos-$build_arch-$(date +%s)"
	mv "$target_dir" "$trash_target"
	rm -rf "$trash_target" >/dev/null 2>&1 || true
fi
