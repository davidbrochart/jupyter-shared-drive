// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@lumino/coreutils';
import { WebrtcProvider as YWebrtcProvider } from 'y-webrtc';
import { ISignal, Signal } from '@lumino/signaling';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { TranslationBundle } from '@jupyterlab/translation';
import { Contents, User } from '@jupyterlab/services';

import {
  DocumentChange,
  ISharedDocument,
  ISharedFile,
  ISharedNotebook,
  YDocument,
  YNotebook
} from '@jupyter/ydoc';

import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ServerConnection } from '@jupyterlab/services';
import { WebrtcProvider } from './provider';
import { Path } from './path';
import { YDrive } from './ydrive';
import {
  ICollaborativeDrive,
  ISharedModelFactory,
  SharedDocumentFactory
} from '@jupyter/docprovider';
import { Awareness } from 'y-protocols/awareness';

const signalingServers = JSON.parse(PageConfig.getOption('signalingServers'));

/**
 * A collaborative implementation for an `IDrive`, talking to other peers using WebRTC.
 */
export class SharedDrive implements ICollaborativeDrive {
  /**
   * Construct a new drive object.
   *
   * @param user - The user manager to add the identity to the awareness of documents.
   */
  constructor(
    user: User.IManager,
    defaultFileBrowser: IDefaultFileBrowser,
    translator: TranslationBundle,
    globalAwareness: Awareness | null,
    name: string
  ) {
    this._user = user;
    this._defaultFileBrowser = defaultFileBrowser;
    this._trans = translator;
    this._globalAwareness = globalAwareness;
    //this._username = this._globalAwareness?.getLocalState()?.user.identity.name;
    //this._username = this._globalAwareness?.getLocalState()?.username;
    this._fileProviders = new Map<string, IFileProvider>();
    this.sharedModelFactory = new SharedModelFactory(this._onCreate);
    this.serverSettings = ServerConnection.makeSettings();
    signalingServers.forEach((url: string) => {
      if (
        url.startsWith('ws://') ||
        url.startsWith('wss://') ||
        url.startsWith('http://') ||
        url.startsWith('https://')
      ) {
        // It's an absolute URL, keep it as-is.
        this._signalingServers.push(url);
      } else {
        // It's a Jupyter server relative URL, build the absolute URL.
        this._signalingServers.push(
          URLExt.join(this.serverSettings.wsUrl, url)
        );
      }
    });
    this.name = name;
    this._fileSystemProvider = new YWebrtcProvider(
      'fileSystem',
      this._ydrive.ydoc,
      {
        signaling: this._signalingServers,
        awareness: this._globalAwareness || undefined
      }
    );
    this._fileSystemProvider.on('synced', this._onSync);
  }

  //get providers(): Map<string, WebrtcProvider> {
  get providers(): Map<string, any> {
    // FIXME
    const providers = new Map();
    for (const key in this._fileProviders) {
      providers.set(key, this._fileProviders.get(key)!.provider);
    }
    return providers;
  }

  private _onSync = (synced: any) => {
    if (synced.synced) {
      this._ready.resolve();
      this._fileSystemProvider?.off('synced', this._onSync);
    }
  };

  async getDownloadUrl(path: string): Promise<string> {
    return '';
  }

  async delete(localPath: string): Promise<void> {
    this._ydrive.delete(localPath);
  }

  async restoreCheckpoint(path: string, checkpointID: string): Promise<void> {}

  async deleteCheckpoint(path: string, checkpointID: string): Promise<void> {}

  async importFile(path: string) {
    const model =
      await this._defaultFileBrowser.model.manager.services.contents.get(path, {
        content: true
      });
    this._ydrive.createFile(model.name); // FIXME: create file in cwd?
    const sharedModel = this.sharedModelFactory.createNew({
      path: model.name,
      format: model.format,
      contentType: model.type,
      collaborative: true
    });
    if (sharedModel) {
      // FIXME: replace with sharedModel.source=model.content
      // when https://github.com/jupyter-server/jupyter_ydoc/pull/273 is merged
      if (sharedModel instanceof YNotebook) {
        (sharedModel as ISharedNotebook).fromJSON(model.content);
      } else {
        (sharedModel as ISharedFile).setSource(model.content);
      }
    }
  }

  async newUntitled(
    options: Contents.ICreateOptions = {}
  ): Promise<Contents.IModel> {
    let ext = '';
    let isDir = false;
    if (options.type === 'directory') {
      isDir = true;
    } else if (options.type === 'notebook') {
      ext = '.ipynb';
    } else {
      ext = '.txt';
    }
    const newPath = this._ydrive.newUntitled(isDir, options.path, ext);
    const newName = new Path(newPath).name;
    const model = {
      name: newName,
      path: newPath,
      type: options.type ?? 'file',
      writable: true,
      created: '',
      last_modified: '',
      mimetype: '',
      content: null,
      format: null
    };

    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: model
    });
    return model;
  }

  async rename(path: string, newPath: string): Promise<Contents.IModel> {
    this._ydrive.move(path, newPath);
    const model = {
      name: new Path(newPath).name,
      path: newPath,
      type: 'file',
      writable: true,
      created: '',
      last_modified: '',
      mimetype: '',
      content: null,
      format: null
    };
    return model;
  }

  async copy(path: string, toDir: string): Promise<Contents.IModel> {
    throw new Error('Copy/paste not supported');
  }

  async createCheckpoint(path: string): Promise<Contents.ICheckpointModel> {
    return {
      id: '',
      last_modified: ''
    };
  }

  async listCheckpoints(path: string): Promise<Contents.ICheckpointModel[]> {
    return [];
  }

  /**
   * The server settings of the drive.
   */
  serverSettings: ServerConnection.ISettings;

  /**
   * The name of the drive, which is used at the leading
   * component of file paths.
   */
  readonly name: string;

  /**
   * A signal emitted when a file operation takes place.
   */
  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * Test whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * SharedModel factory for the SharedDrive.
   */
  readonly sharedModelFactory: ISharedModelFactory;

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._fileProviders.forEach(fp => fp.provider.dispose());
    this._fileProviders.clear();
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Get a file or directory.
   *
   * @param localPath: The path to the file.
   *
   * @param options: The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   */
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    let model: Contents.IModel;
    await this._ready;
    if (!this._ydrive.isDir(localPath)) {
      // It's a file.
      return {
        name: new Path(localPath).name,
        path: localPath,
        type: 'file',
        writable: true,
        created: '',
        last_modified: '',
        mimetype: '',
        content: null,
        format: null
      };
    }

    // It's a directory.
    const content: any[] = [];
    const dirContent = this._ydrive.get(localPath)!;
    for (const [key, value] of dirContent) {
      const isDir = value !== null;
      const type = isDir ? 'directory' : 'file';
      content.push({
        name: key,
        path: `${localPath}/${key}`,
        type,
        writable: true,
        created: '',
        last_modified: '',
        mimetype: '',
        content: null,
        format: null
      });
    }
    model = {
      name: new Path(localPath).name,
      path: localPath,
      type: 'directory',
      writable: true,
      created: '',
      last_modified: '',
      mimetype: '',
      content,
      format: null
    };
    return model;
  }

  /**
   * Save a file.
   *
   * @param localPath - The desired file path.
   *
   * @param options - Optional overrides to the model.
   *
   * @returns A promise which resolves with the file content model when the
   *   file is saved.
   */
  async save(
    localPath: string,
    options: Partial<Contents.IModel> = {}
  ): Promise<Contents.IModel> {
    const fetchOptions: Contents.IFetchOptions = {
      type: options.type,
      format: options.format,
      content: false
    };
    return this.get(localPath, fetchOptions);
  }

  private _onCreate = (
    options: Contents.ISharedFactoryOptions
  ): YDocument<DocumentChange> => {
    if (typeof options.format !== 'string') {
      const factory = (
        this.sharedModelFactory as SharedModelFactory
      ).documentFactories.get(options.contentType)!;
      const sharedModel = factory(options);
      return sharedModel;
    }

    // Check if file exists.
    this._ydrive.get(options.path);

    const key = `${options.format}:${options.contentType}:${options.path}`;

    // Check if shared model alread exists.
    const fileProvider = this._fileProviders.get(key);
    if (fileProvider) {
      return fileProvider.sharedModel;
    }

    const factory = (
      this.sharedModelFactory as SharedModelFactory
    ).documentFactories.get(options.contentType)!;
    const sharedModel = factory(options);

    const provider = new WebrtcProvider({
      url: '',
      path: options.path,
      format: options.format,
      contentType: options.contentType,
      model: sharedModel,
      user: this._user,
      translator: this._trans,
      signalingServers: this._signalingServers
    });

    this._fileProviders.set(key, { provider, sharedModel });

    sharedModel.disposed.connect(() => {
      const fileProvider = this._fileProviders.get(key);
      if (fileProvider) {
        fileProvider.provider.dispose();
        this._fileProviders.delete(key);
      }
    });

    return sharedModel;
  };

  private _user: User.IManager;
  //private _username: string;
  private _defaultFileBrowser: IDefaultFileBrowser;
  private _trans: TranslationBundle;
  private _fileProviders: Map<string, IFileProvider>;
  private _globalAwareness: Awareness | null;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  private _isDisposed = false;
  private _ydrive = new YDrive();
  private _fileSystemProvider: YWebrtcProvider;
  private _ready = new PromiseDelegate<void>();
  private _signalingServers: string[] = [];
}

interface IFileProvider {
  provider: WebrtcProvider;
  sharedModel: YDocument<DocumentChange>;
}

/**
 * Yjs sharedModel factory for real-time collaboration.
 */
class SharedModelFactory implements ISharedModelFactory {
  documentFactories: Map<Contents.ContentType, SharedDocumentFactory>;

  /**
   * Shared model factory constructor
   *
   * @param _onCreate Callback on new document model creation
   */
  constructor(
    private _onCreate: (
      options: Contents.ISharedFactoryOptions
    ) => YDocument<DocumentChange>
  ) {
    this.documentFactories = new Map();
  }

  /**
   * Register a SharedDocumentFactory.
   *
   * @param type Document type
   * @param factory Document factory
   */
  registerDocumentFactory(
    type: Contents.ContentType,
    factory: SharedDocumentFactory
  ) {
    if (this.documentFactories.has(type)) {
      throw new Error(`The content type ${type} already exists`);
    }
    this.documentFactories.set(type, factory);
  }

  /**
   * Create a new `ISharedDocument` instance.
   *
   * It should return `undefined` if the factory is not able to create a `ISharedDocument`.
   */
  createNew(
    options: Contents.ISharedFactoryOptions
  ): ISharedDocument | undefined {
    if (typeof options.format !== 'string') {
      console.warn(`Only defined format are supported; got ${options.format}.`);
      return;
    }

    if (this.documentFactories.has(options.contentType)) {
      const sharedModel = this._onCreate(options);
      return sharedModel;
    }

    return;
  }
}
