// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module shared-drive-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { drive, yfile, ynotebook, sharedFileBrowser } from './filebrowser';

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  drive,
  yfile,
  ynotebook,
  sharedFileBrowser
];

export default plugins;
