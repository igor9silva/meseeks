'use node';

export const setupScript = `
import importlib.util
import subprocess
import sys

def install_fusepy():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "fusepy"])

if importlib.util.find_spec("fuse") is None:
    install_fusepy()

try:
    import fuse
except Exception:
    subprocess.check_call(["sudo", "apt-get", "update"])
    subprocess.check_call(["sudo", "apt-get", "install", "-y", "--no-install-recommends", "libfuse2"])
    if importlib.util.find_spec("fuse") is None:
        install_fusepy()
    import fuse
`;

export const script = String.raw`
import base64
import errno
import json
import os
import shutil
import stat
import sys
import time
import urllib.request

from fuse import FUSE, FuseOSError, Operations


EXCLUDE_DIRS = {'.git', '.pro', 'node_modules', '__pycache__', '.cache', '.venv'}


def clean(path):
    value = path.lstrip('/')
    parts = []
    for part in value.split('/'):
        if not part or part == '.':
            continue
        if part == '..':
            raise FuseOSError(errno.EPERM)
        parts.append(part)
    return '/'.join(parts)


def encoded(path):
    return base64.urlsafe_b64encode(path.encode('utf-8')).decode('ascii')


class ProVfs(Operations):
    def __init__(self, manifest_path, state_dir):
        with open(manifest_path, 'r', encoding='utf-8') as handle:
            manifest = json.load(handle)

        self.state_dir = state_dir
        self.overlay_dir = os.path.join(state_dir, 'overlay')
        self.cache_dir = os.path.join(state_dir, 'cache')
        self.deleted_dir = os.path.join(state_dir, 'deleted')
        os.makedirs(self.overlay_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(self.deleted_dir, exist_ok=True)

        self.entries = {}
        self.dirs = {''}
        self.children = {'': set()}

        for entry in manifest.get('entries', []):
            path = clean(entry['path'])
            if not path:
                continue
            self.entries[path] = entry
            parent = os.path.dirname(path)
            name = os.path.basename(path)
            self.dirs.add(parent)
            self.children.setdefault(parent, set()).add(name)
            if entry['kind'] == 'folder':
                self.dirs.add(path)
                self.children.setdefault(path, set())

            current = parent
            while current:
                parent_dir = os.path.dirname(current)
                self.dirs.add(parent_dir)
                self.children.setdefault(parent_dir, set()).add(os.path.basename(current))
                current = parent_dir

    def overlay_path(self, path):
        return os.path.join(self.overlay_dir, path)

    def cache_path(self, path):
        return os.path.join(self.cache_dir, encoded(path))

    def deleted_path(self, path):
        return os.path.join(self.deleted_dir, path)

    def is_deleted(self, path):
        return os.path.exists(self.deleted_path(path))

    def mark_deleted(self, path):
        target = self.deleted_path(path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'w', encoding='utf-8') as handle:
            handle.write(str(time.time()))

    def unmark_deleted(self, path):
        target = self.deleted_path(path)
        if os.path.exists(target):
            os.remove(target)

    def exists(self, path):
        if path == '':
            return True
        if self.is_deleted(path):
            return False
        if os.path.exists(self.overlay_path(path)):
            return True
        return path in self.entries or path in self.dirs

    def fetch_base(self, path):
        if self.is_deleted(path):
            raise FuseOSError(errno.ENOENT)
        cache_path = self.cache_path(path)
        if os.path.exists(cache_path):
            return cache_path

        entry = self.entries.get(path)
        if not entry or entry.get('kind') != 'file':
            raise FuseOSError(errno.ENOENT)

        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        if 'inlineContent' in entry:
            with open(cache_path, 'w', encoding='utf-8') as handle:
                handle.write(entry.get('inlineContent') or '')
            return cache_path

        url = entry.get('readUrl')
        if not url:
            with open(cache_path, 'w', encoding='utf-8') as handle:
                handle.write('')
            return cache_path

        with urllib.request.urlopen(url) as response:
            body = response.read()
        with open(cache_path, 'wb') as handle:
            handle.write(body)
        return cache_path

    def ensure_parent(self, path):
        parent = os.path.dirname(self.overlay_path(path))
        os.makedirs(parent, exist_ok=True)

    def ensure_overlay_file(self, path):
        target = self.overlay_path(path)
        if os.path.exists(target):
            return target

        self.ensure_parent(path)
        if path in self.entries and self.entries[path].get('kind') == 'file':
            shutil.copyfile(self.fetch_base(path), target)
        else:
            with open(target, 'wb'):
                pass
        self.unmark_deleted(path)
        return target

    def getattr(self, path, fh=None):
        path = clean(path)
        if path == '':
            return {'st_mode': stat.S_IFDIR | 0o755, 'st_nlink': 2}
        if self.is_deleted(path):
            raise FuseOSError(errno.ENOENT)

        overlay_path = self.overlay_path(path)
        if os.path.exists(overlay_path):
            st = os.lstat(overlay_path)
            return {
                'st_atime': st.st_atime,
                'st_ctime': st.st_ctime,
                'st_gid': st.st_gid,
                'st_mode': st.st_mode,
                'st_mtime': st.st_mtime,
                'st_nlink': st.st_nlink,
                'st_size': st.st_size,
                'st_uid': st.st_uid,
            }

        if path in self.dirs or self.entries.get(path, {}).get('kind') == 'folder':
            return {'st_mode': stat.S_IFDIR | 0o755, 'st_nlink': 2}

        entry = self.entries.get(path)
        if entry and entry.get('kind') == 'file':
            return {
                'st_mode': stat.S_IFREG | 0o644,
                'st_nlink': 1,
                'st_size': int(entry.get('size') or 0),
            }

        raise FuseOSError(errno.ENOENT)

    def readdir(self, path, fh):
        path = clean(path)
        if not self.exists(path):
            raise FuseOSError(errno.ENOENT)

        names = {'.', '..'}
        names.update(self.children.get(path, set()))
        overlay_path = self.overlay_path(path)
        if os.path.isdir(overlay_path):
            names.update(os.listdir(overlay_path))

        for name in sorted(names):
            child_path = clean(os.path.join(path, name))
            if name not in {'.', '..'} and self.is_deleted(child_path):
                continue
            yield name

    def open(self, path, flags):
        path = clean(path)
        if flags & (os.O_WRONLY | os.O_RDWR):
            target = self.ensure_overlay_file(path)
        else:
            target = self.overlay_path(path) if os.path.exists(self.overlay_path(path)) else self.fetch_base(path)
        return os.open(target, flags)

    def create(self, path, mode, fi=None):
        path = clean(path)
        self.ensure_parent(path)
        self.unmark_deleted(path)
        return os.open(self.overlay_path(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)

    def read(self, path, size, offset, fh):
        return os.pread(fh, size, offset)

    def write(self, path, data, offset, fh):
        return os.pwrite(fh, data, offset)

    def truncate(self, path, length, fh=None):
        path = clean(path)
        target = self.ensure_overlay_file(path)
        with open(target, 'r+b') as handle:
            handle.truncate(length)

    def flush(self, path, fh):
        try:
            os.fsync(fh)
        except OSError:
            pass

    def release(self, path, fh):
        os.close(fh)

    def mkdir(self, path, mode):
        path = clean(path)
        os.makedirs(self.overlay_path(path), mode=mode, exist_ok=True)
        self.unmark_deleted(path)

    def unlink(self, path):
        path = clean(path)
        overlay_path = self.overlay_path(path)
        if os.path.exists(overlay_path):
            os.remove(overlay_path)
        if path in self.entries:
            self.mark_deleted(path)

    def rmdir(self, path):
        path = clean(path)
        overlay_path = self.overlay_path(path)
        if os.path.isdir(overlay_path):
            os.rmdir(overlay_path)
        if path in self.dirs:
            self.mark_deleted(path)

    def rename(self, old, new):
        old = clean(old)
        new = clean(new)
        new_overlay = self.overlay_path(new)
        os.makedirs(os.path.dirname(new_overlay), exist_ok=True)

        old_overlay = self.overlay_path(old)
        if os.path.exists(old_overlay):
            if os.path.exists(new_overlay):
                if os.path.isdir(new_overlay):
                    shutil.rmtree(new_overlay)
                else:
                    os.remove(new_overlay)
            os.rename(old_overlay, new_overlay)
        elif old in self.entries and self.entries[old].get('kind') == 'file':
            shutil.copyfile(self.fetch_base(old), new_overlay)
        else:
            raise FuseOSError(errno.ENOENT)

        self.mark_deleted(old)
        self.unmark_deleted(new)

    def chmod(self, path, mode):
        path = clean(path)
        os.chmod(self.ensure_overlay_file(path), mode)
        return 0

    def chown(self, path, uid, gid):
        path = clean(path)
        os.chown(self.ensure_overlay_file(path), uid, gid)

    def utimens(self, path, times=None):
        path = clean(path)
        os.utime(self.ensure_overlay_file(path), times)

    def statfs(self, path):
        return {
            'f_bavail': 1024 * 1024,
            'f_bfree': 1024 * 1024,
            'f_blocks': 1024 * 1024,
            'f_bsize': 4096,
            'f_favail': 1024 * 1024,
            'f_ffree': 1024 * 1024,
            'f_files': 1024 * 1024,
            'f_frsize': 4096,
            'f_namemax': 255,
        }


def should_skip(path):
    parts = path.split('/')
    return any(part in EXCLUDE_DIRS for part in parts)


def scan(state_dir, max_bytes):
    overlay_dir = os.path.join(state_dir, 'overlay')
    deleted_dir = os.path.join(state_dir, 'deleted')
    files = []
    deleted_paths = []

    if os.path.isdir(overlay_dir):
        for dirpath, dirnames, filenames in os.walk(overlay_dir):
            dirnames[:] = [name for name in dirnames if name not in EXCLUDE_DIRS]
            for filename in filenames:
                path = os.path.relpath(os.path.join(dirpath, filename), overlay_dir)
                path = path.replace(os.sep, '/')
                if should_skip(path):
                    continue
                try:
                    size = os.path.getsize(os.path.join(dirpath, filename))
                    if size > max_bytes:
                        continue
                    with open(os.path.join(dirpath, filename), 'r', encoding='utf-8') as handle:
                        files.append({
                            'path': path,
                            'content': handle.read(),
                            'contentType': 'text/plain; charset=utf-8',
                        })
                except UnicodeDecodeError:
                    continue
                except OSError:
                    continue

    if os.path.isdir(deleted_dir):
        for dirpath, _, filenames in os.walk(deleted_dir):
            for filename in filenames:
                path = os.path.relpath(os.path.join(dirpath, filename), deleted_dir)
                path = path.replace(os.sep, '/')
                if path and not should_skip(path):
                    deleted_paths.append(path)

    print(json.dumps({'files': files, 'deletedPaths': deleted_paths}))


def main():
    command = sys.argv[1]
    if command == 'mount':
        manifest_path = sys.argv[2]
        mount_path = sys.argv[3]
        state_dir = sys.argv[4]
        os.makedirs(mount_path, exist_ok=True)
        os.makedirs(state_dir, exist_ok=True)
        FUSE(ProVfs(manifest_path, state_dir), mount_path, foreground=True, nothreads=True)
        return
    if command == 'scan':
        scan(sys.argv[2], int(sys.argv[3]))
        return
    raise SystemExit(f'unknown command: {command}')


if __name__ == '__main__':
    main()
`;
