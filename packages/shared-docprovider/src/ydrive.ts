/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as Y from 'yjs';
import { Path } from './path';

export class YDrive {
  constructor() {
    this._ydoc = new Y.Doc();
    this._yroot = this._ydoc.getMap('root');
  }

  get ydoc(): Y.Doc {
    return this._ydoc;
  }

  private _newDir(): Y.Map<any> {
    return new Y.Map();
  }

  isDir(path: string): boolean {
    return this.get(path) ? true : false;
  }

  get(path: string): Y.Map<any> | null {
    if (path === '') {
      return this._yroot;
    }
    let current = this._yroot;
    const parts = new Path(path).parts;
    let cwd = '';
    const lastIdx = parts.length - 1;
    for (let idx = 0; idx < parts.length; idx++) {
      const part = parts[idx];
      if (!current.has(part)) {
        throw new Error(`No entry "${part}" in "${cwd}"`);
      }
      current = current.get(part);
      if (current) {
        cwd = cwd === '' ? part : `${cwd}/${part}`;
      } else if (idx < lastIdx) {
        throw new Error(`Entry "${part}" in "${cwd}" is not a directory.`);
      }
    }
    return current;
  }

  newUntitled(isDir: boolean, path?: string, ext?: string): string {
    path = path ?? '';
    ext = ext ?? '';
    let idx = 0;
    let newName = '';
    const parent = this.get(path)!;
    const dir = parent.toJSON();
    while (newName === '') {
      const _newName: string = `shared${idx}${ext}`;
      if (_newName in dir) {
        idx += 1;
      } else {
        newName = _newName;
      }
    }
    const parts = new Path(path).parts;
    parts.push(newName);
    const newPath = parts.join('/');
    if (isDir) {
      this.createDirectory(newPath);
    } else {
      this.createFile(newPath);
    }
    return newPath;
  }

  createFile(path: string) {
    const parent = this.get(new Path(path).parent)!;
    parent.set(new Path(path).name, null);
  }

  createDirectory(path: string) {
    const parent = this.get(new Path(path).parent)!;
    parent.set(new Path(path).name, this._newDir());
  }

  delete(path: string) {
    const parts = new Path(path).parts;
    if (parts.length === 0) {
      throw new Error('Cannot delete root directory');
    }
    const parent = this.get(new Path(path).parent)!;
    parent.delete(new Path(path).name);
  }

  move(fromPath: string, toPath: string) {
    if (new Path(fromPath).parts.length === 0) {
      throw new Error('Cannot move root directory');
    }
    if (new Path(toPath).parts.length === 0) {
      throw new Error('Cannot move to root directory');
    }
    const fromParent = this.get(new Path(fromPath).parent)!;
    const toParent = this.get(new Path(toPath).parent)!;
    const content = fromParent.get(new Path(fromPath).name).clone();
    this.delete(fromPath);
    toParent.set(new Path(toPath).name, content);
  }

  private _ydoc: Y.Doc;
  private _yroot: Y.Map<any>;
}
