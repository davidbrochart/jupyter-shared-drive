/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { fileIcon, listIcon, refreshIcon } from '@jupyterlab/ui-components';
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
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { YFile, YNotebook } from '@jupyter/ydoc';

//import { ICollaborativeDrive, IGlobalAwareness } from '@jupyter/docprovider';
import { ICollaborativeDrive } from '@jupyter/docprovider';
import { SharedDrive } from '@jupyter/shared-docprovider';
//import { Awareness } from 'y-protocols/awareness';

/**
 * The shared drive provider.
 */
export const drive: JupyterFrontEndPlugin<ICollaborativeDrive> = {
  id: '@jupyter/docprovider-extension:drive',
  description: 'The default collaborative drive provider',
  provides: ICollaborativeDrive,
  requires: [IDefaultFileBrowser],
  //optional: [IGlobalAwareness, ITranslator],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    defaultFileBrowser: IDefaultFileBrowser,
    //globalAwareness: Awareness | null,
    translator: ITranslator | null
  ): ICollaborativeDrive => {
    translator = translator ?? nullTranslator;
    const trans = translator.load('jupyter-shared-drive');
    const drive = new SharedDrive(
      app.serviceManager.user,
      defaultFileBrowser,
      trans,
      //globalAwareness,
      null,
      'Shared'
    );
    return drive;
  }
};

/**
 * Plugin to register the shared model factory for the content type 'file'.
 */
export const yfile: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/shared-docprovider-extension:yfile',
  description:
    "Plugin to register the shared model factory for the content type 'file'",
  autoStart: true,
  requires: [ICollaborativeDrive],
  optional: [],
  activate: (app: JupyterFrontEnd, drive: ICollaborativeDrive): void => {
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
  id: '@jupyter/shared-docprovider-extension:ynotebook',
  description:
    "Plugin to register the shared model factory for the content type 'notebook'",
  autoStart: true,
  requires: [ICollaborativeDrive],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    drive: ICollaborativeDrive,
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
  id: 'jupyter-shared-drive:sharedFileBrowser',
  description: 'The shared file browser factory provider',
  autoStart: true,
  requires: [ICollaborativeDrive, IFileBrowserFactory],
  optional: [IRouter, JupyterFrontEnd.ITreeResolver, ILabShell, ITranslator],
  activate: async (
    app: JupyterFrontEnd,
    drive: ICollaborativeDrive,
    fileBrowserFactory: IFileBrowserFactory,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null,
    labShell: ILabShell | null,
    translator: ITranslator | null
  ): Promise<void> => {
    const { createFileBrowser } = fileBrowserFactory;
    translator = translator ?? nullTranslator;
    const trans = translator.load('jupyter-shared-drive');
    app.serviceManager.contents.addDrive(drive);

    const widget = createFileBrowser('jp-shared-contents-browser', {
      driveName: drive.name,
      // We don't want to restore old state, we don't have a drive handle ready
      restore: false
    });
    widget.title.caption = trans.__('Shared Drive');
    widget.title.icon = listIcon;

    const importButton = new ToolbarButton({
      icon: fileIcon,
      onClick: async () => {
        const path = prompt('Please enter the path of the file to import:');
        if (path !== null) {
          await (drive as SharedDrive).importFile(path);
        }
      },
      tooltip: 'Import File'
    });

    const refreshButton = new ToolbarButton({
      icon: refreshIcon,
      onClick: async () => {
        widget.model.refresh();
      },
      tooltip: 'Refresh File Browser'
    });

    widget.toolbar.insertItem(0, 'refresh', refreshButton);
    widget.toolbar.insertItem(1, 'import', importButton);

    app.shell.add(widget, 'left');
  }
};
