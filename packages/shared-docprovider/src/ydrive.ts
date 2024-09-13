/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as Y from 'yjs';
import { Path } from './path';

export class YDrive {
  constructor() {
    this._ydoc = new Y.Doc();
    this._ycontent = this._ydoc.getMap('content');
  }

  get ydoc(): Y.Doc {
    return this._ydoc;
  }

  private _newDirContent(): Y.Map<any> {
    return new Y.Map([['is_dir', true], ['content', new Y.Map()]]);
  }

  private _newFileContent(): Y.Map<any> {
    return new Y.Map([['is_dir', false], ['content', null]]);
  }

  isDir(path: string): boolean {
    if (path === '') {
      return true;
    }
    if (this.getContent(path) instanceof Y.Map) {
      return true;
    }
    return false;
  }

  getContent(path: string): Y.Map<any> {
    if (path === '') {
      return this._ycontent;
    }
    var currentContent = this._ycontent;
    const parts = new Path(path).parts;
    var cwd = '';
    const lastIdx = parts.length - 1;
    for (var idx = 0; idx < parts.length; idx++) {
      const part = parts[idx];
      if (!currentContent.has(part)) {
        throw new Error(`No entry "${part}" in "${cwd}"`);
      }
      const current = currentContent.get(part);
      if (current.get('is_dir')) {
        cwd = cwd === '' ? part : `${cwd}/${part}`;
      } else if (idx < lastIdx) {
        throw new Error(`Entry "${part}" in "${cwd}" is not a directory.`);
      }
      currentContent = current.get('content');
    }
    return currentContent;
  }

  newUntitled(isDir: boolean, path?: string, ext?: string): string {
    path = path ?? '';
    ext = ext ?? '';
    let idx = 0;
    let newName = '';
    const parentContent = this.getContent(path);
    const dir = parentContent.toJSON();
    while (newName === '') {
      const _newName: string = `untitled${idx}${ext}`;
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
    const parentContent = this.getContent(new Path(path).parent);
    parentContent.set(new Path(path).name, this._newFileContent());
  }

  createDirectory(path: string) {
    const parentContent = this.getContent(new Path(path).parent);
    parentContent.set(new Path(path).name, this._newDirContent());
  }

  delete(path: string) {
    const parts = new Path(path).parts;
    if (parts.length === 0) {
      throw new Error('Cannot delete root directory');
    }
    const parentContent = this.getContent(new Path(path).parent);
    parentContent.delete(new Path(path).name);
  }

  move(fromPath: string, toPath: string) {
    if (new Path(fromPath).parts.length === 0) {
      throw new Error('Cannot move root directory');
    }
    if (new Path(toPath).parts.length === 0) {
      throw new Error('Cannot move to root directory');
    }
    const fromParentContent = this.getContent(new Path(fromPath).parent);
    const toParentContent = this.getContent(new Path(toPath).parent);
    const content = fromParentContent.get(new Path(fromPath).name).clone();
    this.delete(fromPath);
    toParentContent.set(new Path(toPath).name, content);
  }

  private _ydoc: Y.Doc;
  private _ycontent: Y.Map<any>;
}

