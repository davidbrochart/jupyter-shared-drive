/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Widget } from '@lumino/widgets';
import {
  downloadIcon,
  fileUploadIcon,
  listIcon,
  refreshIcon
} from '@jupyterlab/ui-components';
import {
  ILabShell,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Dialog,
  ToolbarButton,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import {
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { YFile, YNotebook } from '@jupyter/ydoc';

//import { ICollaborativeDrive, IGlobalAwareness } from '@jupyter/docprovider';
import { ICollaborativeDrive } from '@jupyter/collaborative-drive';
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
      app,
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
      icon: downloadIcon,
      onClick: async () => {
        const importBtn = Dialog.okButton({
          label: trans.__('Import'),
          accept: true
        });
        const toPath = widget.model.path.slice(drive.name.length + 1);
        const path = await showDialog({
          title: trans.__('Import file: enter source and destination paths'),
          body: new InputWidget('', toPath),
          buttons: [Dialog.cancelButton(), importBtn]
        }).then(result => {
          if (result.button.accept) {
            return result.value ?? undefined;
          }
          return;
        });
        if (path) {
          try {
            await (drive as SharedDrive).importFile(path[0], path[1]);
          } catch (err) {
            await showErrorMessage(
              trans.__('File Import Error for %1', path),
              err as Error
            );
          }
        }
      },
      tooltip: 'Import File'
    });

    const exportButton = new ToolbarButton({
      icon: fileUploadIcon,
      onClick: async () => {
        const exportBtn = Dialog.okButton({
          label: trans.__('Export'),
          accept: true
        });
        const name = (app.shell.currentWidget as any).context.contentsModel
          .name;
        const path = await showDialog({
          title: trans.__('Export file: enter destination path'),
          body: new InputWidget(name),
          buttons: [Dialog.cancelButton(), exportBtn]
        }).then(result => {
          if (result.button.accept) {
            return result.value ?? undefined;
          }
          return;
        });
        if (path) {
          try {
            await (drive as SharedDrive).exportFile(path[0]);
          } catch (err) {
            await showErrorMessage(
              trans.__('File Export Error for %1', path),
              err as Error
            );
          }
        }
      },
      tooltip: 'Export File'
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
    widget.toolbar.insertItem(2, 'export', exportButton);

    app.shell.add(widget, 'left');
  }
};

class InputWidget extends Widget {
  /**
   * Construct a new input widget.
   */
  constructor(path1: string, path2?: string) {
    super({ node: createInputNode(path1, path2) });
  }

  /**
   * Get the value for the widget.
   */
  getValue(): string[] {
    const inputs = this.node.children;
    const value = [(inputs[0] as HTMLInputElement).value];
    if (inputs.length > 1) {
      value.push((inputs[1] as HTMLInputElement).value);
    }
    return value;
  }
}

/**
 * Create the node for a input widget.
 */
function createInputNode(path1: string, path2?: string): HTMLElement {
  const parent = document.createElement('div');
  const input1 = document.createElement('input');
  parent.appendChild(input1);
  input1.value = path1;
  if (path2 !== undefined) {
    const input2 = document.createElement('input');
    input2.value = path2;
    parent.appendChild(input2);
  }
  return parent;
}
