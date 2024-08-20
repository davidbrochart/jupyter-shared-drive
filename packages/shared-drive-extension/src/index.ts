// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module shared-drive-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  userMenuPlugin,
  menuBarPlugin,
  rtcGlobalAwarenessPlugin,
  userEditorCursors
} from './collaboration';

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  userMenuPlugin,
  menuBarPlugin,
  rtcGlobalAwarenessPlugin,
  userEditorCursors
];

export default plugins;
