/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { listIcon, refreshIcon } from '@jupyterlab/ui-components';
//import { listIcon, fileIcon, refreshIcon } from '@jupyterlab/ui-components';
import {
  ILabShell,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ToolbarButton } from '@jupyterlab/apputils';
import {
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';

import { YFile, YNotebook } from '@jupyter/ydoc';

import { IGlobalAwareness } from '@jupyter/shared-drive';
import { ISharedDrive, SharedDrive } from '@jupyter/shared-docprovider';
import { Awareness } from 'y-protocols/awareness';

/**
 * The shared drive provider.
 */
export const drive: JupyterFrontEndPlugin<ISharedDrive> = {
  id: '@jupyter/docprovider-extension:drive',
  description: 'The default collaborative drive provider',
  provides: ISharedDrive,
  requires: [IDefaultFileBrowser, ITranslator],
  optional: [IGlobalAwareness],
  activate: (
    app: JupyterFrontEnd,
    defaultFileBrowser: IDefaultFileBrowser,
    translator: ITranslator,
    globalAwareness: Awareness | null
  ): ISharedDrive => {
    const trans = translator.load('jupyter-shared-drive');
    const drive = new SharedDrive(
      app.serviceManager.user,
      defaultFileBrowser,
      trans,
      globalAwareness,
      'Shared'
    );
    return drive;
  }
};

/**
 * Plugin to register the shared model factory for the content type 'file'.
 */
export const yfile: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/docprovider-extension:yfile',
  description:
    "Plugin to register the shared model factory for the content type 'file'",
  autoStart: true,
  requires: [ISharedDrive],
  optional: [],
  activate: (app: JupyterFrontEnd, drive: ISharedDrive): void => {
    const yFileFactory = () => {
      return new YFile();
    };
    drive.sharedModelFactory.registerDocumentFactory('file', yFileFactory);
  }
};

/**
 * Plugin to register the shared model factory for the content type 'notebook'.
 */
export const ynotebook: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/docprovider-extension:ynotebook',
  description:
    "Plugin to register the shared model factory for the content type 'notebook'",
  autoStart: true,
  requires: [ISharedDrive],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    drive: ISharedDrive,
    settingRegistry: ISettingRegistry | null
  ): void => {
    let disableDocumentWideUndoRedo = true;

    // Fetch settings if possible.
    if (settingRegistry) {
      settingRegistry
        .load('@jupyterlab/notebook-extension:tracker')
        .then(settings => {
          const updateSettings = (settings: ISettingRegistry.ISettings) => {
            const enableDocWideUndo = settings?.get(
              'experimentalEnableDocumentWideUndoRedo'
            ).composite as boolean;

            disableDocumentWideUndoRedo = !enableDocWideUndo ?? true;
          };

          updateSettings(settings);
          settings.changed.connect((settings: ISettingRegistry.ISettings) =>
            updateSettings(settings)
          );
        });
    }

    const yNotebookFactory = () => {
      return new YNotebook({
        disableDocumentWideUndoRedo
      });
    };
    drive.sharedModelFactory.registerDocumentFactory(
      'notebook',
      yNotebookFactory
    );
  }
};

/**
 * The shared file browser factory provider.
 */
export const sharedFileBrowser: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-shared-contents:sharedFileBrowser',
  description: 'The shared file browser factory provider',
  autoStart: true,
  requires: [ISharedDrive, IFileBrowserFactory],
  optional: [
    IRouter,
    JupyterFrontEnd.ITreeResolver,
    ILabShell,
    ISettingRegistry,
    ITranslator
  ],
  activate: async (
    app: JupyterFrontEnd,
    drive: ISharedDrive,
    fileBrowserFactory: IFileBrowserFactory,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null,
    labShell: ILabShell | null,
    translator: ITranslator
  ): Promise<void> => {
    const { createFileBrowser } = fileBrowserFactory;
    //const trans = (translator ?? nullTranslator).load('jupyterlab-shared-contents');
    app.serviceManager.contents.addDrive(drive);

    const widget = createFileBrowser('jp-shared-contents-browser', {
      driveName: drive.name,
      // We don't want to restore old state, we don't have a drive handle ready
      restore: false
    });
    //widget.title.caption = trans.__('Shared Contents');
    widget.title.caption = 'Shared Contents';
    widget.title.icon = listIcon;

    //const importButton = new ToolbarButton({
    //  icon: fileIcon,
    //  onClick: async () => {
    //    let path = prompt('Please enter the path of the file to import:');
    //    if (path !== null) {
    //      await drive.importFile(path);
    //    }
    //  },
    //  tooltip: 'Import File'
    //});

    const refreshButton = new ToolbarButton({
      icon: refreshIcon,
      onClick: async () => {
        widget.model.refresh();
      },
      tooltip: 'Refresh File Browser'
    });

    widget.toolbar.insertItem(0, 'refresh', refreshButton);
    //widget.toolbar.insertItem(1, 'import', importButton);

    app.shell.add(widget, 'left');
  }
};
