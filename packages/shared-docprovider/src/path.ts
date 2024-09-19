/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

export class Path {
  constructor(path: string) {
    this._parts = path.split('/');
    if (this._parts[this._parts.length - 1] === '') {
      this._parts.pop();
    }
  }

  get parts(): Array<string> {
    return this._parts;
  }

  get parent(): string {
    return this._parts.slice(0, this._parts.length - 1).join('/');
  }

  get name(): string {
    return this._parts[this._parts.length - 1];
  }

  private _parts: Array<string>;
}
