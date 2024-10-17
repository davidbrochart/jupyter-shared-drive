/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { UUID } from '@lumino/coreutils';
import * as Y from 'yjs';
import { Path } from './path';

/**
 * A class for accessing the file system.
 * It consists of a shared document that has a root `Y.Map` under 'root'.
 * The root map's keys are the top-level file and directory names.
 * For keys corresponding to files, the value is an ID (string).
 * For keys corresponding to directories, the value is another `Y.Map` with the same structure
 * as the root map, describing the content of the directory, and so on.
 */
export class YDrive {
  constructor() {
    this._ydoc = new Y.Doc();
    this._yroot = this._ydoc.getMap('root');
    //this._yroot.observeDeep((events: Array<Y.YEvent<any>>) => { this._on_change(events); });
  }

  //private _on_change(events: Array<Y.YEvent<any>>) {
  //  for (let event of events) {
  //    console.log('event', event);
  //    for (let name of event.path) {
  //      console.log('name', name);
  //    }
  //    for (let [key, change] of event.changes.keys) {
  //      if (change.action === 'add') {
  //        console.log('add', key, change);
  //      } else if (change.action === 'update') {
  //        console.log('update', key, change);
  //      } else if (change.action === 'delete') {
  //        console.log('delete', key, change);
  //        const path = `${event.path.join('/')}/${key}`;
  //        try {
  //          this.get(path);
  //          console.log('path exists:', path);
  //        }
  //        catch(error) {
  //          console.log('path doesnt exist:', path);
  //        }
  //      }
  //    };
  //  }
  //}

  get ydoc(): Y.Doc {
    return this._ydoc;
  }

  private _newDir(): Y.Map<any> {
    return new Y.Map();
  }

  exists(path: string): boolean {
    if (path === '') {
      return true;
    }
    const _path = new Path(path);
    const parent = this.get(_path.parent) as Y.Map<any>;
    return parent.has(_path.name);
  }

  isDir(path: string): boolean {
    return typeof this.get(path) !== 'string';
  }

  getId(path: string): string {
    const content = this.get(path);
    if (typeof content !== 'string') {
      throw new Error(`Not a file: ${path}`);
    }
    return content;
  }

  listDir(path: string): Map<string, any> {
    const dirList = new Map<string, any>();
    const content = this.get(path);
    if (typeof content === 'string') {
      throw new Error(`Not a directory: ${path}`);
    }
    for (const [key, val] of content) {
      const isDir = typeof val !== 'string';
      dirList.set(key, { isDir });
    }
    return dirList;
  }

  get(path: string): Y.Map<any> | string {
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
      if (typeof current !== 'string') {
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
    const parent = this.get(path) as Y.Map<any>;
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
    const _path = new Path(path);
    const parent = this.get(_path.parent) as Y.Map<any>;
    parent.set(_path.name, UUID.uuid4());
  }

  createDirectory(path: string) {
    const _path = new Path(path);
    const parent = this.get(_path.parent) as Y.Map<any>;
    parent.set(_path.name, this._newDir());
  }

  delete(path: string) {
    const _path = new Path(path);
    if (_path.parts.length === 0) {
      throw new Error('Cannot delete root directory');
    }
    const parent = this.get(_path.parent) as Y.Map<any>;
    parent.delete(_path.name);
  }

  move(fromPath: string, toPath: string) {
    const _fromPath = new Path(fromPath);
    const _toPath = new Path(toPath);
    if (_fromPath.parts.length === 0) {
      throw new Error('Cannot move root directory');
    }
    if (_toPath.parts.length === 0) {
      throw new Error('Cannot move to root directory');
    }
    const fromParent = this.get(_fromPath.parent) as Y.Map<any>;
    const toParent = this.get(_toPath.parent) as Y.Map<any>;
    let content = fromParent.get(_fromPath.name);
    if (typeof content !== 'string') {
      content = content.clone();
    }
    this.delete(fromPath);
    toParent.set(_toPath.name, content);
  }

  private _ydoc: Y.Doc;
  private _yroot: Y.Map<any>;
}
