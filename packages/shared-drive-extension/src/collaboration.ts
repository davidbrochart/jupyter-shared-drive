// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module shared-drive-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IToolbarWidgetRegistry } from '@jupyterlab/apputils';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
//import { WebrtcAwarenessProvider } from '@jupyter/docprovider';
//import { URLExt } from '@jupyterlab/coreutils';
//import { ServerConnection } from '@jupyterlab/services';
import { IStateDB, StateDB } from '@jupyterlab/statedb';
//import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { Menu, MenuBar } from '@lumino/widgets';

import { IAwareness } from '@jupyter/ydoc';

import {
  IGlobalAwareness,
  IUserMenu,
  remoteUserCursors,
  RendererUserMenu,
  UserMenu
} from '@jupyter/shared-drive';

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

/**
 * Jupyter plugin providing the IUserMenu.
 */
export const userMenuPlugin: JupyterFrontEndPlugin<IUserMenu> = {
  id: '@jupyter/shared-drive-extension:userMenu',
  description: 'Provide connected user menu.',
  requires: [],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd): IUserMenu => {
    const { commands } = app;
    const { user } = app.serviceManager;
    return new UserMenu({ commands, user });
  }
};

/**
 * Jupyter plugin adding the IUserMenu to the menu bar if collaborative flag enabled.
 */
export const menuBarPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/shared-drive-extension:user-menu-bar',
  description: 'Add user menu to the interface.',
  autoStart: true,
  requires: [IUserMenu, IToolbarWidgetRegistry],
  activate: async (
    app: JupyterFrontEnd,
    menu: IUserMenu,
    toolbarRegistry: IToolbarWidgetRegistry
  ): Promise<void> => {
    const { user } = app.serviceManager;

    const menuBar = new MenuBar({
      forceItemsPosition: {
        forceX: false,
        forceY: false
      },
      renderer: new RendererUserMenu(user)
    });
    menuBar.id = 'jp-UserMenu';
    user.userChanged.connect(() => menuBar.update());
    menuBar.addMenu(menu as Menu);

    toolbarRegistry.addFactory('TopBar', 'user-menu', () => menuBar);
  }
};

/**
 * Jupyter plugin creating a global awareness for RTC.
 */
export const rtcGlobalAwarenessPlugin: JupyterFrontEndPlugin<IAwareness> = {
  id: '@jupyter/shared-drive-extension:rtcGlobalAwareness',
  description: 'Add global awareness to share working document of users.',
  requires: [IStateDB],
  provides: IGlobalAwareness,
  activate: (app: JupyterFrontEnd, state: StateDB): IAwareness => {
    const { user } = app.serviceManager;

    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    awareness.setLocalState({ username: user.identity?.name, contents: [] });

    //const server = ServerConnection.makeSettings();
    //const url = URLExt.join(server.wsUrl, 'api/collaboration/room');

    //new WebrtcAwarenessProvider({
    //  url: url,
    //  roomID: 'JupyterLab:globalAwareness',
    //  awareness: awareness,
    //  user: user
    //});

    //state.changed.connect(async () => {
    //  const data: any = await state.toJSON();
    //  const current: string = data['layout-restorer:data']?.main?.current || '';

    //  if (current.match(/^\w+:RTC:/)) {
    //    awareness.setLocalStateField('current', current);
    //  } else {
    //    awareness.setLocalStateField('current', null);
    //  }
    //});

    return awareness;
  }
};

export const userEditorCursors: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/share-drive-extension:userEditorCursors',
  description:
    'Add CodeMirror extension to display remote user cursors and selections.',
  autoStart: true,
  requires: [IEditorExtensionRegistry],
  activate: (
    app: JupyterFrontEnd,
    extensions: IEditorExtensionRegistry
  ): void => {
    extensions.addExtension({
      name: 'remote-user-cursors',
      factory(options) {
        const { awareness, ysource: ytext } = options.model.sharedModel as any;
        return EditorExtensionRegistry.createImmutableExtension(
          remoteUserCursors({ awareness, ytext })
        );
      }
    });
  }
};
